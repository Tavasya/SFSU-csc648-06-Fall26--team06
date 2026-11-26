import { Suspense } from "react";
import MessagesClient from "@/components/student/MessagesClient";

export const metadata = {
  title: "Messages | GatorAid",
};

export default function MessagesPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-4 py-8">Loading messages…</main>}>
      <MessagesClient />
    </Suspense>
  );
}