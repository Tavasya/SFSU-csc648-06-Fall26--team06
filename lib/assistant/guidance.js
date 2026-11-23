
import { normalize } from "./query.js";

const GUIDANCE = [
    {
        patterns: [
            /\b(faq|frequently asked questions|help page)\b/,
        ],
        reply:
            "You can find answers to common questions about GatorAid on our FAQ page. It covers events, RSVPs, schedules, recommendations, campus maps, and hosting.",
        links: [
            { label: "View FAQ", href: "/faq" },
        ],
    },
    {
        patterns: [
            /\b(how|where)\b.*\b(upload|scan|import)\b.*\bschedule\b/,
            /\b(schedule scanner)\b/,
            /\b(add|edit|manage)\b.*\b(class schedule|classes)\b/,
        ],
        reply:
            "Open Upload Schedule to scan a screenshot of your class schedule. Review the extracted classes, correct any mistakes, and confirm your schedule. You can also enter classes manually.",
        links: [
            { label: "Upload Schedule", href: "/schedule" },
        ],
    },
    {
        patterns: [
            /\b(change|edit|update|choose|select|manage)\b.*\binterests\b/,
            /\b(my interests|interests page)\b/,
            /\b(how|where)\b.*\binterests?\b/,
        ],
        reply:
            "You can choose or update your interests on the Your Interests page. GatorAid uses these preferences to recommend relevant campus events.",
        links: [
            { label: "Your Interests", href: "/interests" },
        ],
    },
    {
        patterns: [
            /\b(how|where)\b.*\b(recommendations|recommended events)\b/,
            /\b(for you page)\b/,
        ],
        reply:
            "Visit For You to discover upcoming events that match your selected interests. You can update your interests at any time.",
        links: [
            { label: "For You", href: "/events/for-you" },
            { label: "Edit Interests", href: "/interests" },
        ],
    },
    {
        patterns: [
            /\b(how|where)\b.*\b(save|saved|bookmark|unsave)\b.*\bevents?\b/,
            /\b(saved events page)\b/,
        ],
        reply:
            "You can save an event from its event details. Saved events are bookmarks and do not change your RSVP. Visit Your Plans to review your saved events.",
        links: [
            { label: "Your Plans", href: "/saved" },
            { label: "View FAQ", href: "/faq" },
        ],
    },
    {
        patterns: [
            /\b(how|can|where)\b.*\brsvp\b/,
            /\b(change my rsvp)\b/,
        ],
        reply:
            "Open an event and choose Attending, Interested, or Not Attending. Saving an event is separate from RSVPing. Some events may require additional registration.",
        links: [
            { label: "Explore Events", href: "/events" },
            { label: "View FAQ", href: "/faq" },
        ],
    },
    {
        patterns: [
            /\b(where is|how do i use|how do i open)\b.*\b(campus map|map)\b/,
            /\b(find a building|navigate campus)\b/,
        ],
        reply:
            "Open Campus Map to explore SFSU buildings and locations. Select a building to view its location and available events.",
        links: [
            { label: "Campus Map", href: "/map" },
        ],
    },
    {
        patterns: [
            /\b(how|where)\b.*\b(browse|explore|find)\b.*\bevents?\b/,
            /\b(explore events page)\b/,
        ],
        reply:
            "You can browse published campus events on Explore Events. You can also ask me to search by date, category, cost, or building.",
        links: [
            { label: "Explore Events", href: "/events" },
        ],
    },
    {
        patterns: [
            /\b(about gatoraid|who made gatoraid|meet the team)\b/,
        ],
        reply:
            "GatorAid is a student project developed at SFSU. You can learn more about the team on the About page.",
        links: [
            { label: "Meet the Team", href: "/about" },
        ],
    },
];

export function getApplicationGuidance(question) {
    const text = normalize(question);


    // Personalized recommendations should be handled by R8.5,
    // not application navigation guidance.
    if (
        /\b(recommend|recommends|recommended|recommendation|recommendations|suggest|suggestions|personalized)\b/.test(text) &&
        /\b(me|my|mine|interests?|preferences|personalized)\b/.test(text)
    ) {
        return null;
    }

    if (
        /\b(based on|match|matches|matching)\b/.test(text) &&
        /\b(my interests?|my preferences)\b/.test(text)
    ) {
        return null;
    }


    // Leave event discovery, summaries and comparisons
    // to the existing event search system.
    if (
        /\b(summarize|compare)\b/.test(text) ||
        /\b(show|find|list|which)\b.*\bevents?\b.*\b(today|tomorrow|week|month)\b/.test(text)
    ) {
        return null;
    }

    const match = GUIDANCE.find((item) =>
        item.patterns.some((pattern) => pattern.test(text))
    );

    if (!match) return null;

    return {
        reply: match.reply,
        links: match.links,
        events: [],
        categories: [],
        total: 0,
    };
}
