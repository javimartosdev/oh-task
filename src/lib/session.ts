import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
  }
}

/** Session user only if they still exist in Oh-Task DB (not Habit Dock). */
export async function getSessionUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

export { auth };
