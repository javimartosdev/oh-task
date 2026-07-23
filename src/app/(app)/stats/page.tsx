import { redirect } from "next/navigation";

/** Stats de hábitos viven en Habit Dock. */
export default function StatsRedirect() {
  redirect("/today");
}
