import { redirect } from "next/navigation";

/** Legacy /tasks → Inbox */
export default function TasksRedirectPage() {
  redirect("/inbox");
}
