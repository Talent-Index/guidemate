import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Contract, formatUnits, getAddress, isAddress, parseEther, parseUnits, Wallet } from "ethers";
import mockUsdcAbi from "./abi/MockUSDC.json" with { type: "json" };
import { provider, requireChain } from "./chain.js";
import { listWalletTransactions, recordWalletTransaction, getLedgerBalanceUsdc } from "./ledger.js";
import { MinisendRampProvider } from "./ramp/minisend.js";
import { getRampProvider, isKotaniRamp, isMinisendRamp, isSimulatedRamp } from "./ramp/index.js";
import { sendUsdcOnBase, getTreasuryUsdcBalance } from "./treasuryBase.js";
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
  if (profile?.wallet_address) {
    await ensureCustodialGas(profileId).catch((err) => {
      console.warn("[wallet] gas top-up skipped", err);
    });
    return profile.wallet_address as string;
  }

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

  await ensureCustodialGas(profileId).catch((err) => {
    console.warn("[wallet] initial gas top-up skipped", err);
  });

  return wallet.address;
}

const DEFAULT_MIN_AVAX = "0.02";

/** Custodial wallets need native AVAX on Fuji to send USDC; top up from the platform signer when low. */
export async function ensureCustodialGas(profileId: string): Promise<void> {
  const { signer, provider } = requireChain();
  const address = await getWalletAddress(profileId);
  if (!address) return;

  const minWei = parseEther(process.env.CUSTODIAL_MIN_AVAX ?? DEFAULT_MIN_AVAX);
  const balance = await provider.getBalance(address);
  if (balance >= minWei) return;

  const topUp = minWei - balance;
  const signerAddress = await signer.getAddress();
  const signerBalance = await provider.getBalance(signerAddress);
  const reserve = parseEther("0.001");
  if (signerBalance < topUp + reserve) {
    throw new Error("Guidemate gas wallet is low. Contact support or try again later.");
  }

  const tx = await signer.sendTransaction({ to: address, value: topUp });
  await tx.wait();
}

export function friendlyWalletError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/payout treasury|treasury is low|base eth/i.test(message)) return message;
  if (/insufficient funds|intrinsic transaction cost|INSUFFICIENT_FUNDS|gas wallet is low/i.test(message)) {
    if (/gas wallet is low/i.test(message)) return message;
    return "Withdrawal could not send USDC yet. Try again in a few seconds.";
  }
  if (/insufficient wallet balance/i.test(message)) return message;
  if (/already in progress/i.test(message)) {
    return "A withdrawal is still processing. Refresh the page, wait a few minutes, then try again.";
  }
  if (/MINISEND|minisend|off-ramp|offramp/i.test(message)) {
    return message.split("\n")[0] ?? "M-Pesa withdrawal failed. Try again or use a smaller amount.";
  }
  return message.split("\n")[0] ?? "Wallet action failed";
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
  await failStaleProcessingWithdrawals(profileId);
  const address = await getWalletAddress(profileId);
  const onChainBalanceUsdc = address ? await getWalletBalance(profileId) : 0;
  const ledgerBalanceUsdc = await getLedgerBalanceUsdc(profileId);
  // Ledger reflects real releases / withdrawals; Fuji mock USDC from demo bookings can inflate on-chain.
  const balanceUsdc = Math.max(0, ledgerBalanceUsdc);
  const balanceKes = await usdcToKes(balanceUsdc);
  const transactions = await listWalletTransactions(profileId, 50);
  return { address, balanceUsdc, balanceKes, onChainBalanceUsdc, ledgerBalanceUsdc, transactions };
}

const STALE_WITHDRAWAL_MS = 10 * 60 * 1000;

/** Unblock guides when an old off-ramp never completed or failed without updating status. */
async function failStaleProcessingWithdrawals(profileId: string): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_WITHDRAWAL_MS).toISOString();
  const { data: stale } = await supabaseAdmin
    .from("withdrawal_requests")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "processing")
    .lt("created_at", cutoff);
  if (!stale?.length) return;

  const ids = stale.map((r) => r.id as string);
  await supabaseAdmin.from("withdrawal_requests").update({ status: "failed" }).in("id", ids);
  for (const id of ids) {
    await supabaseAdmin
      .from("wallet_transactions")
      .update({ status: "failed" })
      .eq("profile_id", profileId)
      .eq("reference_type", "withdrawal")
      .eq("reference_id", id)
      .eq("type", "mpesa_withdraw")
      .eq("status", "processing");
  }
}

export async function withdrawToMpesa(
  profileId: string,
  amountUsdc: number,
  phone: string,
  opts?: { bookingId?: string }
): Promise<{ withdrawalId: string; reference: string; kesAmount: number; pending?: true }> {
  if (amountUsdc <= 0) throw new Error("amount must be positive");
  const ledgerBalance = await getLedgerBalanceUsdc(profileId);
  if (amountUsdc > ledgerBalance) {
    throw new Error("insufficient wallet balance");
  }

  if (!isMinisendRamp()) {
    const onChainBalance = await getWalletBalance(profileId);
    if (amountUsdc > onChainBalance) {
      throw new Error(
        "Your on-chain balance is still syncing. Try a smaller amount or contact support."
      );
    }
  }

  await failStaleProcessingWithdrawals(profileId);

  const { data: inFlight } = await supabaseAdmin
    .from("withdrawal_requests")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "processing")
    .limit(1);
  if (inFlight?.length) {
    throw new Error("A withdrawal is already in progress. Wait a few minutes and try again.");
  }

  const ramp = getRampProvider();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .maybeSingle();
  const accountName = (profile?.full_name as string) ?? "Guide";

  const quote = await ramp.getQuote(amountUsdc, "off", { phone, accountName });
  const kesAmount = quote.kes;

  const address = await getWalletAddress(profileId);

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

  try {
    const offRamp = await ramp.createOffRamp({
      withdrawalId: withdrawal.id,
      phone,
      amountUsdc,
      kesAmount,
      accountName,
      senderAddress: address ?? undefined,
      bookingId: opts?.bookingId,
    });

    if (offRamp.escrowAddress && !isSimulatedRamp()) {
      let txHash: string;

      if (isMinisendRamp()) {
        const depositAmount = offRamp.depositAmountUsdc ?? amountUsdc;
        const treasuryUsdc = await getTreasuryUsdcBalance();
        if (treasuryUsdc + 1e-6 < depositAmount) {
          throw new Error(
            "Payout treasury is low on USDC. Minisend settlements may still be processing. Try again later."
          );
        }
        // Tourist M-Pesa settles USDC on Base; pay Minisend off-ramp from treasury (no Fuji AVAX gas).
        txHash = await sendUsdcOnBase(offRamp.escrowAddress, depositAmount).catch((err) => {
          const msg = (err as Error).message ?? "";
          if (/insufficient funds|INSUFFICIENT_FUNDS/i.test(msg)) {
            throw new Error(
              "Payout wallet needs a little ETH on Base for gas, or more USDC. Check Minisend settlement, then try again."
            );
          }
          throw err;
        });
        if (offRamp.orderId && ramp instanceof MinisendRampProvider) {
          await ramp.submitOfframpDeposit(offRamp.orderId, txHash);
        }
        await supabaseAdmin
          .from("withdrawal_requests")
          .update({ tx_hash: txHash, ramp_ref: offRamp.orderId ?? offRamp.reference })
          .eq("id", withdrawal.id);
        console.log(`[wallet] minisend off-ramp: sent Base USDC ${depositAmount} tx ${txHash}`);
      } else if (isKotaniRamp()) {
        txHash = await signUsdcTransfer(profileId, offRamp.escrowAddress, amountUsdc);
        await supabaseAdmin.from("withdrawal_requests").update({ tx_hash: txHash }).eq("id", withdrawal.id);
      }
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

    await recordWalletTransaction({
      profileId,
      type: "mpesa_withdraw",
      amountUsdc: -amountUsdc,
      amountKes: kesAmount,
      referenceType: "withdrawal",
      referenceId: withdrawal.id,
      mpesaRef: offRamp.orderId ?? offRamp.reference,
      status: "processing",
    });

    return {
      withdrawalId: withdrawal.id,
      reference: offRamp.reference,
      kesAmount,
      pending: true as const,
    };
  } catch (err) {
    await supabaseAdmin.from("withdrawal_requests").update({ status: "failed" }).eq("id", withdrawal.id);
    console.error("[wallet] withdrawToMpesa failed", err);
    throw new Error(friendlyWalletError(err));
  }
}

export async function signUsdcTransfer(profileId: string, to: string, amountUsdc: number): Promise<string> {
  const encrypted = await getEncryptedKey(profileId);
  if (!encrypted) throw new Error("no custodial wallet for profile");
  await ensureCustodialGas(profileId);
  const { usdc } = requireChain();
  const decimals = await usdc.decimals();
  const amountUnits = parseUnits(amountUsdc.toString(), decimals);
  const wallet = new Wallet(decryptPrivateKey(encrypted), provider);
  const token = new Contract(await usdc.getAddress(), mockUsdcAbi, wallet);
  try {
    const tx = await token.transfer(to, amountUnits);
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  } catch (err) {
    throw new Error(friendlyWalletError(err));
  }
}

export async function sendUsdcFromWallet(
  profileId: string,
  toRaw: string,
  amountUsdc: number
): Promise<{ txHash: string; to: string; amountUsdc: number }> {
  if (amountUsdc <= 0) throw new Error("amount must be positive");
  if (!isAddress(toRaw)) throw new Error("enter a valid wallet address");
  const to = getAddress(toRaw);
  const from = await getWalletAddress(profileId);
  if (!from) throw new Error("create a wallet first");
  if (getAddress(from) === to) throw new Error("cannot send to your own address");
  const balance = await getWalletBalance(profileId);
  if (amountUsdc > balance) throw new Error("insufficient wallet balance");

  let txHash: string;
  try {
    txHash = await signUsdcTransfer(profileId, to, amountUsdc);
  } catch (err) {
    throw err instanceof Error ? err : new Error(friendlyWalletError(err));
  }

  await recordWalletTransaction({
    profileId,
    type: "transfer_out",
    amountUsdc: -amountUsdc,
    referenceType: "transfer",
    referenceId: txHash,
    txHash,
    metadata: { to },
  });

  const { data: recipient } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("wallet_address", to)
    .maybeSingle();
  if (recipient?.id && recipient.id !== profileId) {
    await recordWalletTransaction({
      profileId: recipient.id as string,
      type: "transfer_in",
      amountUsdc,
      referenceType: "transfer",
      referenceId: txHash,
      txHash,
      metadata: { from: getAddress(from) },
    });
  }

  return { txHash, to, amountUsdc };
}
