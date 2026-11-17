
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Search,
    BookOpen,
    CalendarDays,
    ArrowRight,
    MapPin,
    Info,
    Sparkles,
} from "lucide-react";

//import RoomViewer3D from "@/components/rooms/RoomViewer3D";
import EventActions from "@/components/student/EventActions";

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
        title: "Compare Halloween 5K Fun Run and Softball Club Scrimmage",
        subtitle: "Compare two events",
    },
];

function formatEventDate(value) {
    return new Date(value).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function ComparisonCards({ events }) {
    if (!Array.isArray(events) || events.length !== 2) {
        return null;
    }

    return (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
            {events.map((event) => (
                <div
                    key={event.id}
                    className="min-w-0 rounded-xl border border-[#E8E3EF] bg-[#FAF9FC] p-4"
                >
                    <h3 className="text-base font-bold text-[#292437]">
                        {event.title}
                    </h3>

                    <p className="mt-3 text-xs font-semibold text-[#65449B]">
                        Date and time
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                        {formatEventDate(event.start_date_time)}
                        {" – "}
                        {new Date(event.end_date_time).toLocaleTimeString(
                            "en-US",
                            {
                                timeZone: "America/Los_Angeles",
                                hour: "numeric",
                                minute: "2-digit",
                            }
                        )}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-[#65449B]">
                        Location
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                        {event.location || "Not specified"}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-[#65449B]">
                        Admission
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                        {event.admission_type === "free"
                            ? "Free"
                            : event.admission_type === "paid"
                                ? "Paid"
                                : "Not specified"}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-[#65449B]">
                        About this event
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        {event.description || "No description provided."}
                    </p>

                    <Link
                        href={`/events/${event.id}`}
                        className="mt-4 inline-block rounded-full bg-[#65449B] px-4 py-2 text-xs font-semibold !text-white hover:bg-[#503581]"
                    >
                        View event details
                    </Link>
                </div>
            ))}
        </div>
    );
}

function EventResultCard({ event, activeRoom, onSelectRoom }) {
    const room = event.rooms?.[0];
    const roomKey = room ? `${event.id}:${room.id}` : null;

    return (
        <div className="rounded-xl border border-[#E8E3EF] bg-[#FAF9FC] p-4">
            <h3 className="text-base font-bold text-[#292437]">
                {event.title}
            </h3>

            {event.description && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {event.description}
                </p>
            )}

            <p className="mt-3 text-xs text-gray-500">
                {formatEventDate(event.start_date_time)}
            </p>

            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={13} />
                {event.locations?.building_name || "Location not specified"}
            </p>

            {/* 3D venue preview */}
            {room && (
                <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold text-[#292437]">
                        Explore this building in 3D
                    </p>


                    {activeRoom === roomKey ? (
                        <div className="overflow-hidden rounded-xl border border-[#E8E3EF]">

                            <iframe
                                src={`/rooms/${room.id}/embed`}
                                title={`3D view of ${room.name}`}
                                className="h-72 w-full border-0 rounded-xl"
                                loading="lazy"
                                allow="fullscreen"
                            />

                        </div>
                    ) : (

                        <div className="flex h-40 flex-col items-center justify-center rounded-xl bg-[#211B2D] text-center">
                            <button
                                type="button"
                                onClick={() => onSelectRoom(roomKey)}
                                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#292437]"
                            >
                                Show 3D venue preview
                            </button>

                            <p className="mt-2 text-xs text-white/60">
                                First load downloads approximately 80 MB.
                            </p>
                        </div>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                        This is an available scan from the event's building.
                        It may not represent the exact event room.
                    </p>
                </div>
            )}

            <Link
                href={`/events/${event.id}`}
                className="mt-4 inline-block text-sm font-semibold text-[#65449B] hover:underline"
            >
                View event details
            </Link>

            {/* Existing Save Event and RSVP functionality */}
            <div className="mt-4 border-t border-[#E8E3EF] pt-4">
                <EventActions event={event} />
            </div>
        </div>
    );
}

export default function AssistantPage() {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeRoom, setActiveRoom] = useState(null);

    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [messages, loading]);

    async function handleSubmit(event) {
        event.preventDefault();

        const text = question.trim();

        if (!text || loading) return;

        setQuestion("");
        setLoading(true);

        setMessages((previous) => [
            ...previous,
            {
                role: "user",
                content: text,
            },
        ]);

        try {
            const response = await fetch("/api/assistant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    question: text,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to complete your request."
                );
            }

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    content: data.answer || "No response available.",
                    events: Array.isArray(data.events)
                        ? data.events
                        : [],
                    comparison: Array.isArray(data.comparison)
                        ? data.comparison
                        : null,
                },
            ]);
        } catch (error) {
            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    content:
                        error.message ||
                        "Something went wrong. Please try again.",
                    events: [],
                    comparison: null,
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    function selectSuggestion(text) {
        setQuestion(text);
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            {/* Assistant header */}
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

                <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold text-[#292437]">
                        AI Event Assistant
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Find, summarize, and compare published GatorAid events.
                    </p>
                </div>

                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                    Beta
                </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
                {/* Chat section */}
                <div className="flex min-w-0 flex-col gap-5">
                    {messages.length === 0 && (
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
                                            onClick={() =>
                                                selectSuggestion(item.title)
                                            }
                                            className="flex items-center gap-3 rounded-2xl border border-[#E8E3EF] bg-white p-4 text-left transition hover:border-[#65449B]"
                                        >
                                            <div className="shrink-0 rounded-xl bg-[#FFF8E8] p-3">
                                                <Icon
                                                    size={20}
                                                    className="text-[#65449B]"
                                                />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-[#292437]">
                                                    {item.title}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {item.subtitle}
                                                </p>
                                            </div>

                                            <ArrowRight
                                                size={17}
                                                className="shrink-0 text-gray-400"
                                            />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <div className="flex items-start gap-3">
                                    <Info
                                        size={19}
                                        className="mt-0.5 shrink-0 text-blue-600"
                                    />
                                    <div>
                                        <p className="font-semibold text-[#292437]">
                                            How I can help
                                        </p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Search published GatorAid events,
                                            summarize event details, compare events,
                                            and explore available 3D venue previews.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Scrollable conversation */}
                    {messages.length > 0 && (
                        <div
                            className="max-h-[65vh] min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-2"
                            aria-live="polite"
                            aria-label="AI Assistant conversation"
                        >
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex min-w-0 ${message.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`min-w-0 rounded-2xl px-5 py-4 text-sm ${message.role === "user"
                                            ? "max-w-[85%] bg-[#65449B] text-white"
                                            : "w-full border border-[#E8E3EF] bg-white text-[#292437]"
                                            }`}
                                    >
                                        <div className="space-y-3">
                                            <p className="whitespace-pre-line leading-relaxed">
                                                {message.content}
                                            </p>

                                            {/* Comparison results */}
                                            <ComparisonCards
                                                events={message.comparison}
                                            />

                                            {/* Event search and summary results */}
                                            {message.events?.map((event) => (
                                                <EventResultCard
                                                    key={`${index}-${event.id}`}
                                                    event={event}
                                                    activeRoom={activeRoom}
                                                    onSelectRoom={setActiveRoom}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Correct placement: after all messages */}
                            <div ref={chatEndRef} />
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

                    {/* Chat input */}
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-2xl border border-[#D8CDE9] bg-white p-4 shadow-sm"
                    >
                        <textarea
                            value={question}
                            onChange={(event) =>
                                setQuestion(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key === "Enter" &&
                                    !event.shiftKey &&
                                    !event.nativeEvent.isComposing
                                ) {
                                    event.preventDefault();

                                    if (!loading && question.trim()) {
                                        event.currentTarget.form?.requestSubmit();
                                    }
                                }
                            }}
                            placeholder='Ask about events — e.g. "Show me exhibitions happening today"'
                            rows={2}
                            disabled={loading}
                            aria-label="Ask the AI Event Assistant"
                            className="w-full resize-none border-none bg-transparent text-sm text-[#292437] outline-none disabled:opacity-60"
                        />

                        <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-xs text-gray-500">
                                Powered by GatorAid event information
                            </span>

                            <button
                                type="submit"
                                disabled={!question.trim() || loading}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FBBF24] text-[#292437] transition hover:bg-[#F5B917] disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Send message"
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Information sidebar */}
                <aside className="space-y-4">
                    <div className="rounded-2xl border border-[#E8E3EF] bg-white p-5">
                        <h2 className="font-bold text-[#292437]">
                            How answers work
                        </h2>

                        <p className="mt-3 text-sm leading-relaxed text-gray-600">
                            The assistant searches published GatorAid events
                            using event titles, descriptions, dates, and
                            locations. AI summaries use event information
                            stored in Supabase.
                        </p>

                        <p className="mt-3 text-xs text-gray-500">
                            Always check event details before attending.
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
