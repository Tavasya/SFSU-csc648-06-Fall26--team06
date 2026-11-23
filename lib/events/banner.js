/**
 * Public interfaces supporting R2.2.
 * @module lib/events/banner
 */
/*
 * lib/events/banner.js
 *
 * PURPOSE:
 * One rule for event banners, shared by every page that shows an event
 * without an uploaded cover image: the event's FIRST category picks the
 * banner's colors and icon. Used by:
 *  - Explore events (app/(platform)/events/page.js)
 *  - the event detail page (components/gatoraid/EventDetails.js)
 *  - the Create / Edit event live preview (components/gatoraid/EventForm.js)
 *  - the Campus Map side panel (components/map/MapSidePanel.js, MapEventDetail.js)
 *
 * "First" means the first category in the event's category_ids, which is the
 * first one the host selected in the form.
 */

import {
  BookOpen,
  Briefcase,
  CalendarDays,
  HeartPulse,
  Palette,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

// One banner per category in the Supabase "categories" table.
export const BANNERS = {
  Academic: { Icon: BookOpen, from: "#3f9a8a", to: "#7fcab9" },
  Arts: { Icon: Palette, from: "#d35c7a", to: "#f19aac" },
  Career: { Icon: Briefcase, from: "#7b5cc4", to: "#4b2f8a" },
  "Health & Wellness": { Icon: HeartPulse, from: "#3f9a6a", to: "#8fd0a8" },
  Social: { Icon: Users, from: "#e0634f", to: "#f0a08f" },
  Sports: { Icon: Trophy, from: "#e0913a", to: "#f2c14e" },
  Technology: { Icon: Sparkles, from: "#5b7fdb", to: "#9db4ee" },
};

// Extra tag names used only by the map's sample events (lib/map/sample-events.js).
const SAMPLE_TAGS = {
  Networking: "Career",
  Tech: "Technology",
  AI: "Technology",
  Study: "Academic",
  Clubs: "Social",
  "Free food": "Social",
};

// No category (or an unknown one): the original GatorAid blue calendar banner.
export const DEFAULT_BANNER = { Icon: CalendarDays, from: "#587ad9", to: "#adc6f0" };

// The banner for an event's first category name.
/**
 * Choose a category icon and color palette, falling back to the default event banner.
 * @function bannerFor
 * @memberof module:lib/events/banner
 * @static
 * @param {string} firstCategoryName - First category name used to select a banner.
 * @returns {Object} The selected { Icon, from, to } palette.
 */
export function bannerFor(firstCategoryName) {
  return BANNERS[firstCategoryName] ?? BANNERS[SAMPLE_TAGS[firstCategoryName]] ?? DEFAULT_BANNER;
}

// Inline style for a banner background (same angle as .ga-cover in platform.css).
/**
 * Build a CSS background gradient from a banner palette.
 * @function bannerStyle
 * @memberof module:lib/events/banner
 * @static
 * @param {Object} options - Grouped function options.
 * @param {*} options.from - The from setting or callback.
 * @param {*} options.to - The to setting or callback.
 * @returns {Object} A CSS style object with a linear-gradient background.
 */
export const bannerStyle = ({ from, to }) => ({ background: `linear-gradient(120deg, ${from}, ${to})` });

// Category names in the event's own order (category_ids), so the first badge
// shown is the one that picked the banner. Unknown ids are skipped.
/**
 * Resolve event category IDs to names in the event-defined order.
 * @function orderedCategoryNames
 * @memberof module:lib/events/banner
 * @static
 * @param {Array<string>} categoryIds - Event category IDs in display order.
 * @param {Array<Object>} categories - Available category records.
 * @returns {Array<string>} Resolved category names in the supplied ID order.
 */
export function orderedCategoryNames(categoryIds, categories) {
  const names = new Map((categories ?? []).map((c) => [c.id, c.name]));
  return (categoryIds ?? []).map((id) => names.get(id)).filter(Boolean);
}
