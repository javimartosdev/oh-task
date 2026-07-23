import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { contexts, inviteCodes, users } from "@/db/schema";
import { DEFAULT_CONTEXTS } from "@/lib/habits";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  inviteCode: z.string().min(2).max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const inviteOnly = process.env.INVITE_ONLY === "1";
    let invite: typeof inviteCodes.$inferSelect | null = null;

    if (inviteOnly || parsed.data.inviteCode) {
      if (!parsed.data.inviteCode) {
        return NextResponse.json(
          { error: "Se requiere código de invitación" },
          { status: 400 },
        );
      }
      const [row] = await db
        .select()
        .from(inviteCodes)
        .where(
          and(
            eq(inviteCodes.code, parsed.data.inviteCode.toLowerCase()),
            sql`${inviteCodes.usedCount} < ${inviteCodes.maxUses}`,
            or(
              isNull(inviteCodes.expiresAt),
              gt(inviteCodes.expiresAt, new Date()),
            ),
          ),
        )
        .limit(1);
      if (!row) {
        return NextResponse.json(
          { error: "Código de invitación inválido" },
          { status: 400 },
        );
      }
      invite = row;
    }

    const email = parsed.data.email.toLowerCase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email,
        passwordHash,
        inviteCodeUsed: invite?.code ?? null,
      })
      .returning({ id: users.id });

    if (invite) {
      await db
        .update(inviteCodes)
        .set({ usedCount: invite.usedCount + 1 })
        .where(eq(inviteCodes.id, invite.id));
    }

    await db.insert(contexts).values(
      DEFAULT_CONTEXTS.map((ctx, index) => ({
        userId: user.id,
        name: ctx.name,
        icon: ctx.icon,
        color: ctx.color,
        sortOrder: index,
      })),
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 },
    );
  }
}
