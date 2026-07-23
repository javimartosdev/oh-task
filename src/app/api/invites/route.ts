import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.createdBy, user.id))
    .orderBy(desc(inviteCodes.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const maxUses = typeof body.maxUses === "number" ? body.maxUses : 5;
  const code = (body.code as string) || randomBytes(4).toString("hex");

  const [row] = await db
    .insert(inviteCodes)
    .values({
      code: code.toLowerCase(),
      maxUses,
      createdBy: user.id,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

const validateSchema = z.object({ code: z.string().min(2) });

export async function PATCH(request: Request) {
  const parsed = validateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(inviteCodes)
    .where(
      and(
        eq(inviteCodes.code, parsed.data.code.toLowerCase()),
        sql`${inviteCodes.usedCount} < ${inviteCodes.maxUses}`,
        or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, new Date())),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({ valid: true, code: row.code });
}
