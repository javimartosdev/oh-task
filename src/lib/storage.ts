import { randomUUID } from "crypto";

const MAX_DATA_URL_BYTES = 2 * 1024 * 1024;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL,
  );
}

export async function uploadAttachment(
  bytes: Buffer,
  filename: string,
  mimeType: string,
  userId: string,
): Promise<{ storageKey: string; url: string }> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `local/${userId}/${randomUUID()}-${safeName}`;

  if (isR2Configured()) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const accountId = process.env.R2_ACCOUNT_ID!;
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: storageKey,
        Body: bytes,
        ContentType: mimeType,
      }),
    );

    const base = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
    return { storageKey, url: `${base}/${storageKey}` };
  }

  if (bytes.length > MAX_DATA_URL_BYTES) {
    throw new Error("Archivo demasiado grande (máx 2 MB sin R2)");
  }

  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
  return { storageKey: `data:${mimeType}`, url: dataUrl };
}
