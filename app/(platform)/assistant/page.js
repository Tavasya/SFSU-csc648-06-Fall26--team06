
"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import RoomViewer3D from "@/components/rooms/RoomViewer3D";
import EventActions from "@/components/student/EventActions";
import {
    Sparkles,
    Search,
    BookOpen,
    CalendarDays,
    ArrowRight,
    MapPin,
    Info,
} from "lucide-react";

const suggestions = [
    {
        icon: Search,
        title: "Show me exhibitions happening at SFSU today",
        subtitle: "Find campus exhibitions",
    },
    {
        icon: BookOpen,
        title: "Summarize the Machine Learning event happening today",
        subtitle: "Summarize an event",
    },
    {
        icon: CalendarDays,
        title: "What career events are happening this week?",
        subtitle: "Find upcoming events",
    },
    {
        icon: Sparkles,
        title: "Compare two campus events",
        subtitle: "Compare events",
    },
];

export default function AssistantPage() {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);


    async function handleSubmit(event) {
        event.preventDefault();

        const text = question.trim();
        if (!text || loading) return;

        setQuestion("");
        setLoading(true);

        setMessages((previous) => [
            ...previous,
            { role: "user", content: text },
        ]);

        try {
            const response = await fetch("/api/assistant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ question: text }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to search events."
                );
            }

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    content: data.answer,
                    events: data.events || [],
                },
            ]);
        } catch (error) {
            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    content:
                        error.message || "Something went wrong.",
                    events: [],
                },
            ]);
        } finally {
            setLoading(false);
        }
    }


    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center gap-4">

                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-yellow-400 bg-white">
                    <Image
                        src="/images/gator-assistant.jpg"
                        alt="GatorAid AI Assistant mascot"
                        fill
                        sizes="80px"
                        className="object-contain p-1"
                    />
                </div>


                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-[#292437]">
                        AI Event Assistant
                    </h1>
                    <p className="text-sm text-gray-500">
                        Find, summarize, and compare published GatorAid events.
                    </p>
                </div>

                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                    Beta
                </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
                <div className="space-y-5">
                    {messages.length === 0 ? (
                        <>
                            <p className="text-lg text-[#292437]">
                                Ask in plain language. I can find events,
                                summarize them, and compare them.
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {suggestions.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <button
                                            key={item.title}
                                            type="button"
                                            onClick={() => setQuestion(item.title)}
                                            className="flex items-center gap-3 rounded-2xl border border-[#E8E3EF] bg-white p-4 text-left transition hover:border-[#65449B]"
                                        >
                                            <div className="rounded-xl bg-[#FFF8E8] p-3">
                                                <Icon size={20} className="text-[#65449B]" />
                                            </div>

                                            <div className="flex-1">
                                                <p className="font-semibold text-[#292437]">
                                                    {item.title}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.subtitle}
                                                </p>
                                            </div>

                                            <ArrowRight size={17} className="text-gray-400" />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <div className="flex items-start gap-3">
                                    <Info size={19} className="mt-0.5 text-blue-600" />
                                    <div>
                                        <p className="font-semibold text-[#292437]">
                                            What I can't do
                                        </p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            I only help with events listed in GatorAid.
                                            For general campus questions, check the
                                            official SFSU website.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4" aria-live="polite">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm ${message.role === "user"
                                            ? "bg-[#65449B] text-white"
                                            : "border border-[#E8E3EF] bg-white text-[#292437]"
                                            }`}
                                    >

                                        <div className="space-y-3">
                                            <p className="whitespace-pre-line">
                                                {message.content}
                                            </p>

                                            {message.events?.map((event) => (
                                                <div
                                                    key={event.id}
                                                    className="rounded-xl border border-[#E8E3EF] bg-[#FAF9FC] p-4"
                                                >
                                                    <p className="font-semibold text-[#292437]">
                                                        {event.title}
                                                    </p>

                                                    {event.description && (
                                                        <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                                                            {event.description}
                                                        </p>
                                                    )}

                                                    <p className="mt-2 text-xs text-gray-500">
                                                        {new Date(
                                                            event.start_date_time
                                                        ).toLocaleString("en-US", {
                                                            timeZone: "America/Los_Angeles",
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {event.locations?.building_name ||
                                                            "Location not specified"}
                                                    </p>


                                                    {/* 3D venue preview */}
                                                    {event.rooms?.length > 0 && (
                                                        <div className="mt-4">
                                                            <p className="mb-2 text-sm font-semibold text-[#292437]">
                                                                Explore this building in 3D
                                                            </p>

                                                            <RoomViewer3D
                                                                room={event.rooms[0]}
                                                                className="h-56"
                                                            />

                                                            <p className="mt-2 text-xs text-gray-500">
                                                                This preview shows an available scan from the
                                                                event's building. It may not be the exact event room.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Event details link */}
                                                    <Link
                                                        href={`/events/${event.id}`}
                                                        className="mt-3 inline-block text-sm font-semibold text-[#65449B] hover:underline"
                                                    >
                                                        View event details

                                                        {/* Save Event and RSVP */}
                                                        <div className="mt-4 border-t border-[#E8E3EF] pt-4">
                                                            <EventActions event={event} />
                                                        </div>

                                                    </Link>

                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Loading indicator */}
                    {loading && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="flex items-center gap-3 rounded-xl border border-[#E8E3EF] bg-white p-4 text-sm text-gray-600"
                        >
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#D8CDE9] border-t-[#65449B]" />
                            Searching GatorAid events...
                        </div>
                    )}
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-2xl border border-[#D8CDE9] bg-white p-4 shadow-sm"
                    >
                        <textarea
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            placeholder='Ask about events — e.g. "Show me exhibitions happening today"'
                            rows={2}
                            className="w-full resize-none border-none bg-transparent text-sm text-[#292437] outline-none"
                            aria-label="Ask the AI Event Assistant"
                        />

                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Powered by GatorAid event information
                            </span>

                            <button
                                type="submit"
                                disabled={!question.trim() || loading}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FBBF24] text-[#292437] disabled:opacity-40"
                                aria-label="Send message"
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </form>
                </div>

                <aside className="space-y-4">
                    <div className="rounded-2xl border border-[#E8E3EF] bg-white p-5">
                        <h2 className="font-bold text-[#292437]">
                            How answers work
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-gray-600">
                            The assistant will search published GatorAid events
                            using event titles, descriptions, dates, and locations.
                            AI summaries will use verified event information.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[#E8E3EF] bg-white p-5">
                        <h2 className="font-bold text-[#292437]">
                            Prefer to browse?
                        </h2>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                                href="/events"
                                className="rounded-full border border-[#D8CDE9] px-4 py-2 text-sm text-[#65449B]"
                            >
                                Explore Events
                            </Link>

                            <Link
                                href="/map"
                                className="flex items-center gap-2 rounded-full border border-[#D8CDE9] px-4 py-2 text-sm text-[#65449B]"
                            >
                                <MapPin size={15} />
                                Campus Map
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
