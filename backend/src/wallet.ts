import { createCipheriv, randomBytes } from "node:crypto";
import { Wallet } from "ethers";
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

/// AES-256-GCM: iv (12) + auth tag (16) + ciphertext, all hex, colon-separated.
function encryptPrivateKey(privateKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/// Generates a receive-only custodial wallet for a guide, stores the encrypted
/// private key, and writes the address onto profiles.wallet_address.
/// Idempotent: if the profile already has a wallet_address, that address is returned.
export async function provisionGuideWallet(profileId: string): Promise<string> {
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
