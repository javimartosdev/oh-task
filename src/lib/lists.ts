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

export function findInboxId(
  lists: { id: string; name: string; isFolder: boolean }[],
): string | null {
  return lists.find((l) => !l.isFolder && l.name === INBOX_NAME)?.id ?? null;
}
