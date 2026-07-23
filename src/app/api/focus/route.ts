import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { focusSessions } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getFocusStats } from "@/lib/data";

const schema = z.object({
  kind: z.string().min(1).max(40),
  durationSeconds: z.number().int().min(1).max(86400),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getFocusStats(user.id));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const [row] = await db
    .insert(focusSessions)
    .values({
      userId: user.id,
      kind: parsed.data.kind,
      durationSeconds: parsed.data.durationSeconds,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
