import { addDays, startOfDay, startOfWeek } from "date-fns";
import { getCalendarBlocks, getScheduledTasks } from "@/lib/data";
import { fetchGoogleEvents } from "@/lib/google-calendar";
import { getSessionUser } from "@/lib/session";
import { CalendarView } from "@/components/calendar-view";

export default async function CalendarPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const from = startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 });
  const to = addDays(from, 21);

  const [blocks, scheduledTasks, googleEvents] = await Promise.all([
    getCalendarBlocks(user.id, from, to),
    getScheduledTasks(user.id, from, to),
    fetchGoogleEvents(user.id, from, to).catch(() => []),
  ]);

  return (
    <CalendarView
      blocks={blocks.map((b) => ({
        id: b.id,
        title: b.title,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        color: b.color,
        taskId: b.taskId,
      }))}
      scheduledTasks={scheduledTasks.map((t) => ({
        id: t.id,
        title: t.title,
        scheduledStart: t.scheduledStart!.toISOString(),
        scheduledEnd: t.scheduledEnd!.toISOString(),
        priority: t.priority,
        status: t.status,
      }))}
      googleEvents={googleEvents}
    />
  );
}
