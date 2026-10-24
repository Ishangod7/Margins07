import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type TimetableResponse } from "@/lib/api";
import TimetableClient from "./TimetableClient";

export const metadata = {
  title: "Class Timetable | Margins",
  description: "Weekly schedule, live lecture shelf, and lab batch locations for TCET Mumbai AI&DS.",
};

export default async function TimetablePage() {
  const { token, me } = await requireSession();

  const data = await apiFetch<TimetableResponse>("/timetable", token).catch(() => ({
    current_day: "Monday",
    current_time_ist: "09:00 AM",
    current_slot: null,
    next_slot: null,
    selected_batch: "ALL",
    days: [],
    announcements: [],
  }));

  const isCr = me.profile?.role === "cr";

  return (
    <AppShell displayName={me.profile?.display_name}>
      <TimetableClient initialData={data} isCr={isCr} token={token} />
    </AppShell>
  );
}
