import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getTaskAttachments } from "@/lib/data";
import { uploadAttachment } from "@/lib/storage";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const taskId = new URL(request.url).searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

  return NextResponse.json(await getTaskAttachments(user.id, taskId));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const taskId = String(form.get("taskId") ?? "");
  const file = form.get("file");

  if (!taskId || !(file instanceof File)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Máximo 5 MB" }, { status: 400 });
  }

  try {
    const uploaded = await uploadAttachment(
      buf,
      file.name,
      file.type || "application/octet-stream",
      user.id,
    );

    const [row] = await db
      .insert(attachments)
      .values({
        userId: user.id,
        taskId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: buf.length,
        storageKey: uploaded.storageKey,
        url: uploaded.url,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al subir" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .delete(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, user.id)));

  return NextResponse.json({ ok: true });
}
