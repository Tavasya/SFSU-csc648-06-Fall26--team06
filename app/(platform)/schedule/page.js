/*
 * app/(platform)/schedule/page.js
 *
 * PURPOSE:
 * /schedule: upload or enter your class schedule. Schedules are saved to a
 * student account, so signed-out visitors see a sign-in card first, which
 * brings them back here after signing in.
 */

import Link from "next/link";
import { CalendarDays, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ScheduleUploader from "@/components/schedule/ScheduleUploader";

export const metadata = {
  title: "Upload schedule | GatorAid",
};

export default async function Page() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (user) return <ScheduleUploader />;

  return (
    <section className="ga-access ga-card">
      <LockKeyhole size={32} />
      <h2>Sign in to upload your schedule</h2>
      <p>
        Your schedule (classes, work and any other commitments) is saved to your GatorAid account,
        so it can show on Your calendar and help you find events that fit around it.
      </p>
      <Link className="ga-button" href="/login?next=/schedule">
        <CalendarDays size={16} /> Sign in to upload your schedule
      </Link>
    </section>
  );
}
