import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contexts, users } from "@/db/schema";
import { INBOX_NAME } from "@/lib/lists";

/** Ensure the user has an Inbox list; return its id. Server-only. */
export async function ensureUserInbox(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const existing = await db
    .select()
    .from(contexts)
    .where(and(eq(contexts.userId, userId), eq(contexts.name, INBOX_NAME)))
    .limit(1);

  if (existing[0] && !existing[0].isFolder) {
    return existing[0].id;
  }

  const [row] = await db
    .insert(contexts)
    .values({
      userId,
      name: INBOX_NAME,
      icon: "inbox",
      color: "#89b4fa",
      sortOrder: 0,
      isFolder: false,
      parentId: null,
    })
    .returning({ id: contexts.id });

  return row.id;
}
