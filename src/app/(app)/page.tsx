import { redirect } from "next/navigation";

/** Home → Inbox (tasks-first). Habits live in Habit Dock, not Oh-Task. */
export default function HomePage() {
  redirect("/inbox");
}
