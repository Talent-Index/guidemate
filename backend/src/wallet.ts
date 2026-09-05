import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Contract, formatUnits, parseUnits, Wallet } from "ethers";
import mockUsdcAbi from "./abi/MockUSDC.json" with { type: "json" };
import { provider, requireChain } from "./chain.js";
import { listWalletTransactions, recordWalletTransaction } from "./ledger.js";
import { getRampProvider, isSimulatedRamp } from "./ramp/index.js";
import { usdcToKes } from "./fx.js";
import { supabaseAdmin } from "./supabase.js";

function encryptionKey(): Buffer {
  const hex = process.env.WALLET_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

function encryptPrivateKey(privateKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptPrivateKey(encrypted: string): string {
  const [ivHex, tagHex, dataHex] = encrypted.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("invalid encrypted key format");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

async function getEncryptedKey(profileId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("guide_wallet_keys")
    .select("encrypted_private_key")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.encrypted_private_key as string) ?? null;
}

export async function provisionCustodialWallet(profileId: string): Promise<string> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (profile?.wallet_address) return profile.wallet_address as string;

  const wallet = Wallet.createRandom();
  const encrypted = encryptPrivateKey(wallet.privateKey);

  const { error: upsertError } = await supabaseAdmin.from("guide_wallet_keys").upsert({
    profile_id: profileId,
    encrypted_private_key: encrypted,
  });
  if (upsertError) throw new Error(upsertError.message);

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ wallet_address: wallet.address })
    .eq("id", profileId);
  if (updateError) throw new Error(updateError.message);

  return wallet.address;
}

/** @deprecated use provisionCustodialWallet */
export const provisionGuideWallet = provisionCustodialWallet;

export async function getWalletAddress(profileId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.wallet_address as string) ?? null;
}

export async function getWalletBalance(profileId: string): Promise<number> {
  const address = await getWalletAddress(profileId);
  if (!address) return 0;
  const { usdc } = requireChain();
  const decimals = await usdc.decimals();
  const balance = await usdc.balanceOf(address);
  return Number(formatUnits(balance, decimals));
}

export async function getWalletSummary(profileId: string) {
  const address = await getWalletAddress(profileId);
  const balanceUsdc = address ? await getWalletBalance(profileId) : 0;
  const balanceKes = await usdcToKes(balanceUsdc);
  const transactions = await listWalletTransactions(profileId, 50);
  return { address, balanceUsdc, balanceKes, transactions };
}

export async function withdrawToMpesa(
  profileId: string,
  amountUsdc: number,
  phone: string
): Promise<{ withdrawalId: string; reference: string; kesAmount: number; pending?: true }> {
  if (amountUsdc <= 0) throw new Error("amount must be positive");
  const balance = await getWalletBalance(profileId);
  if (amountUsdc > balance) throw new Error("insufficient wallet balance");

  const ramp = getRampProvider();
  const quote = await ramp.getQuote(amountUsdc, "off");
  const kesAmount = quote.kes;

  const address = await getWalletAddress(profileId);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .maybeSingle();

  const { data: withdrawal, error: insertError } = await supabaseAdmin
    .from("withdrawal_requests")
    .insert({
      profile_id: profileId,
      amount_usdc: amountUsdc,
      kes_amount: kesAmount,
      phone,
      status: "processing",
    })
    .select()
    .single();
  if (insertError) throw new Error(insertError.message);

  const offRamp = await ramp.createOffRamp({
    withdrawalId: withdrawal.id,
    phone,
    amountUsdc,
    kesAmount,
    accountName: (profile?.full_name as string) ?? "Guide",
    senderAddress: address ?? undefined,
  });

  if (offRamp.escrowAddress && !isSimulatedRamp()) {
    const txHash = await signUsdcTransfer(profileId, offRamp.escrowAddress, amountUsdc);
    await supabaseAdmin.from("withdrawal_requests").update({ tx_hash: txHash }).eq("id", withdrawal.id);
  }

  if (isSimulatedRamp() || !offRamp.async) {
    await supabaseAdmin
      .from("withdrawal_requests")
      .update({ status: "completed", ramp_ref: offRamp.reference, completed_at: new Date().toISOString() })
      .eq("id", withdrawal.id);

    await recordWalletTransaction({
      profileId,
      type: "mpesa_withdraw",
      amountUsdc: -amountUsdc,
      amountKes: kesAmount,
      referenceType: "withdrawal",
      referenceId: withdrawal.id,
      mpesaRef: offRamp.reference,
      status: "completed",
    });

    return { withdrawalId: withdrawal.id, reference: offRamp.reference, kesAmount };
  }

  return {
    withdrawalId: withdrawal.id,
    reference: offRamp.reference,
    kesAmount,
    pending: true as const,
  };
}

export async function signUsdcTransfer(profileId: string, to: string, amountUsdc: number): Promise<string> {
  const encrypted = await getEncryptedKey(profileId);
  if (!encrypted) throw new Error("no custodial wallet for profile");
  const { usdc } = requireChain();
  const decimals = await usdc.decimals();
  const amountUnits = parseUnits(amountUsdc.toString(), decimals);
  const wallet = new Wallet(decryptPrivateKey(encrypted), provider);
  const token = new Contract(await usdc.getAddress(), mockUsdcAbi, wallet);
  const tx = await token.transfer(to, amountUnits);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}
