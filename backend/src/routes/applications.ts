import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "../supabase.js";

export const applicationsRouter = Router();

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const filePayloadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(200),
  base64: z.string().min(1),
});

const applicationSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().min(1).max(40),
  idNumber: z.string().min(1).max(80),
  location: z.string().min(1).max(200),
  experiencePitch: z.string().min(1).max(5000),
  portfolioLinks: z.array(z.string().max(500)).max(20).default([]),
  refereeName: z.string().min(1).max(200),
  refereePhone: z.string().min(1).max(40),
  refereeEmail: z.string().email().max(320).optional().nullable(),
  nationalIdDoc: filePayloadSchema,
  goodConduct: filePayloadSchema,
  kraPin: z.string().min(1).max(20),
  kraPinDoc: filePayloadSchema,
  professionalCertificates: z.array(filePayloadSchema).min(1).max(5),
  cv: filePayloadSchema.optional().nullable(),
  proof: filePayloadSchema.optional().nullable(),
});

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function uploadGuideDoc(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`${filename} is too large (max 10 MB).`);
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error(`${filename} must be a PDF, Word document, or image.`);
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${randomUUID()}/${safeName}`;
  const { error } = await supabaseAdmin.storage.from("guide-proofs").upload(path, buffer, {
    contentType,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

function decodeFile(file: z.infer<typeof filePayloadSchema>): { buffer: Buffer; filename: string; contentType: string } {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(file.base64, "base64");
  } catch {
    throw new Error(`Could not read ${file.filename}.`);
  }
  if (!buffer.length) throw new Error(`${file.filename} is empty.`);
  return { buffer, filename: file.filename, contentType: file.contentType };
}

applicationsRouter.post("/", async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid application" });
  }

  const input = parsed.data;

  try {
    const nationalIdDoc = decodeFile(input.nationalIdDoc);
    const goodConduct = decodeFile(input.goodConduct);
    const kraPinDoc = decodeFile(input.kraPinDoc);
    const cv = input.cv ? decodeFile(input.cv) : null;
    const proof = input.proof ? decodeFile(input.proof) : null;
    const professionalFiles = input.professionalCertificates.map((file) => decodeFile(file));

    const [nationalIdPath, goodConductPath, kraPinDocPath, cvPath, proofPath, ...professionalPaths] =
      await Promise.all([
        uploadGuideDoc(nationalIdDoc.buffer, nationalIdDoc.filename, nationalIdDoc.contentType),
        uploadGuideDoc(goodConduct.buffer, goodConduct.filename, goodConduct.contentType),
        uploadGuideDoc(kraPinDoc.buffer, kraPinDoc.filename, kraPinDoc.contentType),
        cv ? uploadGuideDoc(cv.buffer, cv.filename, cv.contentType) : Promise.resolve(null),
        proof ? uploadGuideDoc(proof.buffer, proof.filename, proof.contentType) : Promise.resolve(null),
        ...professionalFiles.map((file) =>
          uploadGuideDoc(file.buffer, file.filename, file.contentType)
        ),
      ]);

    const { error: insertError } = await supabaseAdmin.from("guide_applications").insert({
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      id_number: input.idNumber.trim(),
      location: input.location.trim(),
      experience_pitch: input.experiencePitch.trim(),
      portfolio_links: input.portfolioLinks.map((link) => link.trim()).filter(Boolean),
      national_id_doc_path: nationalIdPath,
      good_conduct_doc_path: goodConductPath,
      kra_pin: input.kraPin.trim().toUpperCase(),
      kra_pin_doc_path: kraPinDocPath,
      professional_certificate_paths: professionalPaths,
      cv_path: cvPath,
      proof_of_work_path: proofPath,
      referee_name: input.refereeName.trim(),
      referee_phone: input.refereePhone.trim(),
      referee_email: input.refereeEmail?.trim().toLowerCase() || null,
    });

    if (insertError) throw new Error(insertError.message);

    res.json({ ok: true });
  } catch (err) {
    console.error("[applications] submit failed", err);
    res.status(500).json({ error: (err as Error).message ?? "application failed" });
  }
});
