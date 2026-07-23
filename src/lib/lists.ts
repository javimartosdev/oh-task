import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contexts } from "@/db/schema";

/** Default lists seeded on register. Inbox is the system capture list. */
export const DEFAULT_LISTS = [
  { name: "Inbox", icon: "inbox", color: "#89b4fa", isFolder: false },
  { name: "Personal", icon: "user", color: "#cba6f7", isFolder: false },
  { name: "Trabajo", icon: "briefcase", color: "#94e2d5", isFolder: false },
] as const;

export const INBOX_NAME = "Inbox";

export function isInboxList(list: {
  name: string;
  icon?: string | null;
}): boolean {
  return list.name === INBOX_NAME;
}

/** Ensure the user has an Inbox list; return its id. */
export async function ensureUserInbox(userId: string): Promise<string> {
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

export function findInboxId(
  lists: { id: string; name: string; isFolder: boolean }[],
): string | null {
  return lists.find((l) => !l.isFolder && l.name === INBOX_NAME)?.id ?? null;
}
