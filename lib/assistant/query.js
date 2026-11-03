/*
 * lib/assistant/query.js
 *
 * PURPOSE:
 * Turns a student's question for the AI Event Assistant (app/api/assistant)
 * into filters, and applies them to published events. Everything here is
 * plain rules, no AI, so results only ever come from real events and the
 * same question always gives the same events. Gemini is only used afterwards
 * to write summaries of the events found here.
 *
 * A question can combine any of these:
 *  - dates:        today, tonight, tomorrow, this/next week, this/next weekend,
 *                  this/next month, a weekday ("Friday"), a date ("Nov 5",
 *                  "11/5"), a month ("December"), "week of Nov 16", past events
 *  - time of day:  morning, lunch, afternoon, evening / tonight
 *  - categories:   the GatorAid categories by name ("arts", "tech", "career")
 *  - admission:    free, paid; "no RSVP" / "drop-in"
 *  - access:       wheelchair accessible, ASL
 *  - place:        a building or venue ("at the Student Center", "Creative Arts")
 *  - topic words:  anything else ("yoga", "jazz") is matched against the
 *                  title, description and room; if nothing mentions them,
 *                  related words fall back to their category ("yoga" ->
 *                  Health & Wellness)
 *  - intent:       find (default), summarize, compare, greeting, help
 *
 * Dates are campus time (America/Los_Angeles). No imports from the app, so it
 * can be tested on its own.
 */

import { addDays, toPacific, weekStart } from "../calendar/week.js";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const MONTH_SHORT = { jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Words that name a GatorAid category (categories table names): the question
// is filtered to that category ("arts events", "tech events").
export const CATEGORY_WORDS = {
  Academic: ["academic", "academics"],
  Arts: ["art", "arts", "artsy", "creative"],
  Career: ["career", "careers", "professional development"],
  "Health & Wellness": ["health", "wellness", "wellbeing", "well being", "mental health", "self care", "health and wellness"],
  Social: ["social", "socials", "hang out", "hangout", "make friends", "meet people"],
  Sports: ["sport", "sports", "athletic", "athletics"],
  Technology: ["tech", "technology", "computer science", "coding", "programming", "computers"],
};

// More specific words ("yoga", "jazz", "internship"). They are searched in event
// titles and descriptions like any topic word, and only if no event mentions
// them does the search fall back to their category.
export const TOPIC_CATEGORY = Object.fromEntries(Object.entries({
  Academic: [
    "study", "studying", "tutoring", "tutor", "lecture", "research", "seminar", "class", "review",
    "exam", "midterm", "finals", "writing", "math", "statistics", "advising", "poster", "symposium",
  ],
  Arts: [
    "music", "concert", "theatre", "theater", "dance", "dancing", "film", "movie", "gallery",
    "exhibition", "exhibit", "painting", "drawing", "ceramics", "poetry", "performance", "jazz",
    "photography", "printmaking", "sculpture", "orchestra", "improv", "comedy", "watercolor",
  ],
  Career: [
    "internship", "job", "resume", "networking", "interview", "recruiter", "linkedin", "pitch",
    "panel", "headshot",
  ],
  "Health & Wellness": [
    "yoga", "meditation", "mindfulness", "nutrition", "stress", "sleep", "counseling", "healthy",
    "flu", "vaccine", "relax", "relaxing",
  ],
  Social: [
    "party", "mixer", "meetup", "friends", "games", "trivia", "club", "potluck", "dinner",
    "karaoke", "dance party",
  ],
  Sports: [
    "basketball", "soccer", "volleyball", "badminton", "pickleball", "frisbee", "running", "run",
    "workout", "fitness", "climbing", "swim", "swimming", "intramural", "hiit", "softball",
  ],
  Technology: [
    "software", "ai", "machine learning", "data", "cybersecurity", "security", "hackathon", "web",
    "python", "robotics", "engineering", "github", "cloud", "3d printing", "esports", "game design",
  ],
}).flatMap(([category, words]) => words.map((word) => [word, category])));

// Other names students use for buildings (locations.building_name).
export const PLACE_ALIASES = {
  "student center": "Cesar Chavez Student Center",
  "cesar chavez": "Cesar Chavez Student Center",
  library: "J. Paul Leonard Library",
  "leonard library": "J. Paul Leonard Library",
  gym: "Gymnasium",
  mashouf: "Mashouf Wellness Center",
  "wellness center": "Mashouf Wellness Center",
  "rec center": "Mashouf Wellness Center",
  seic: "Science & Engineering Innovation Center",
  "science building": "Science",
  "business building": "Business",
  "fine arts building": "Fine Arts",
  "creative arts building": "Creative Arts",
};

// Words that never mean a topic (questions, filler, and words handled by filters).
const FILLER = new Set(`
  a an the is are was were be been am i im me my we our you your it its this that these those
  what whats which who when where why how do does did can could would should will shall may
  might please show find tell give list get see any some all every there here going on
  happening happen happens event events activity activities thing things stuff something
  anything to for of in at on by with about from into near around inside between and or but
  not no yes so if than then also just only really very much many more most other else
  recommend recommendation recommendations suggest suggestion suggestions good great best
  cool fun interesting nice looking look want wanna like love need know help options option
  sfsu campus school university college student students upcoming soon next this last later
  today tonight tomorrow yesterday week weekend weekends month day days time times date dates
  morning mornings afternoon afternoons evening evenings night nights lunch lunchtime noon
  early late free paid cost costs price ticket tickets ticketed admission rsvp required
  drop dropin wheelchair accessible accessibility asl sign language interpreter interpreted
  summarize summary summaries overview recap describe explain compare comparison versus vs
  past previous ended completed finished already happened held
  first year years transfer transfers graduate grad grads undergraduate undergrad undergrads
  freshman freshmen gen generation am pm o clock oclock
`.trim().split(/\s+/));

export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Does the normalized text contain the phrase as whole words?
export function hasPhrase(text, phrase) {
  return ` ${text} `.includes(` ${normalize(phrase)} `);
}

// Remove a phrase (whole words) from normalized text.
function without(text, phrase) {
  return ` ${text} `.replace(` ${normalize(phrase)} `, " ").replace(/\s+/g, " ").trim();
}

function monthIndex(word) {
  const i = MONTHS.indexOf(word);
  return i >= 0 ? i : (MONTH_SHORT[word] ?? -1);
}

function validDay(year, month, day) {
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
}

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
function shortDate(day) {
  return SHORT_DATE.format(new Date(`${day}T12:00:00Z`));
}

// The date range a question asks about:
// { from, to, label, past, invalid } (from/to are day keys, or null for "any upcoming";
// label reads after "events", e.g. "tomorrow", "on Fri, Nov 6", "in December").
//  - text: normalized question, today: day key in campus time
export function parseDates(text, today) {
  const year = Number(today.slice(0, 4));
  const past = /\b(past|previous|ended|completed|finished|already happened|last week|yesterday)\b/.test(text);
  const range = (from, to, label) => ({ from, to, label, past, invalid: false });
  const monday = weekStart(today);

  // Pick the year so a date without one is the next time it comes around.
  const upcomingYear = (m, d) => {
    const day = validDay(year, m, d);
    return day && day < today && !past ? year + 1 : year;
  };

  let m = text.match(/\bweek of ([a-z]+) (\d{1,2})(?:st|nd|rd|th)?\b/);
  if (m && monthIndex(m[1]) >= 0) {
    const mi = monthIndex(m[1]);
    const day = validDay(upcomingYear(mi, Number(m[2])), mi, Number(m[2]));
    if (!day) return { from: null, to: null, label: "", past, invalid: true };
    const start = weekStart(day);
    return range(start, addDays(start, 6), `during the week of ${shortDate(start)}`);
  }

  if (/\btonight\b/.test(text) || /\btoday\b/.test(text)) return range(today, today, "today");
  if (/\btomorrow\b/.test(text)) return range(addDays(today, 1), addDays(today, 1), "tomorrow");
  if (/\byesterday\b/.test(text)) return range(addDays(today, -1), addDays(today, -1), "yesterday");
  if (/\bnext weekend\b/.test(text)) {
    const sat = addDays(monday, 12);
    return range(sat, addDays(sat, 1), "next weekend");
  }
  if (/\bweekend\b/.test(text)) {
    const sat = addDays(monday, 5);
    return range(sat, addDays(sat, 1), "this weekend");
  }
  if (/\bnext week\b/.test(text)) {
    const start = addDays(monday, 7);
    return range(start, addDays(start, 6), `next week (${shortDate(start)} – ${shortDate(addDays(start, 6))})`);
  }
  if (/\blast week\b/.test(text)) {
    const start = addDays(monday, -7);
    return range(start, addDays(start, 6), "last week");
  }
  if (/\b(this|the) week\b/.test(text) || /\bweek\b/.test(text)) {
    return range(monday, addDays(monday, 6), `this week (${shortDate(monday)} – ${shortDate(addDays(monday, 6))})`);
  }
  if (/\bnext month\b/.test(text)) {
    const mi = (Number(today.slice(5, 7)) % 12);
    const y = mi === 0 ? year + 1 : year;
    return range(`${y}-${String(mi + 1).padStart(2, "0")}-01`, lastDayOfMonth(y, mi), `in ${MONTHS[mi][0].toUpperCase()}${MONTHS[mi].slice(1)}`);
  }
  if (/\bthis month\b/.test(text)) {
    const mi = Number(today.slice(5, 7)) - 1;
    return range(today.slice(0, 8) + "01", lastDayOfMonth(year, mi), "this month");
  }

  // "Nov 5", "November 5th"
  m = [...text.matchAll(/\b([a-z]+) (\d{1,2})(?:st|nd|rd|th)?\b/g)].find((x) => monthIndex(x[1]) >= 0);
  if (m) {
    const mi = monthIndex(m[1]);
    const day = validDay(upcomingYear(mi, Number(m[2])), mi, Number(m[2]));
    if (!day) return { from: null, to: null, label: "", past, invalid: true };
    return range(day, day, `on ${shortDate(day)}`);
  }
  // "11/5"
  m = text.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (m) {
    const mi = Number(m[1]) - 1;
    const day = mi >= 0 && mi < 12 ? validDay(upcomingYear(mi, Number(m[2])), mi, Number(m[2])) : null;
    if (!day) return { from: null, to: null, label: "", past, invalid: true };
    return range(day, day, `on ${shortDate(day)}`);
  }
  // "Friday", "on thursday" (the next one, or today)
  const weekday = WEEKDAYS.findIndex((w) => hasPhrase(text, w) || hasPhrase(text, `${w}s`));
  if (weekday >= 0) {
    const todayIndex = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
    const day = addDays(today, (weekday - todayIndex + 7) % 7);
    const name = WEEKDAYS[weekday][0].toUpperCase() + WEEKDAYS[weekday].slice(1);
    return range(day, day, `on ${name}, ${shortDate(day)}`);
  }
  // "December"
  const month = MONTHS.findIndex((name) => hasPhrase(text, name));
  if (month >= 0) {
    const y = !past && month < Number(today.slice(5, 7)) - 1 ? year + 1 : year;
    return range(`${y}-${String(month + 1).padStart(2, "0")}-01`, lastDayOfMonth(y, month), `in ${MONTHS[month][0].toUpperCase()}${MONTHS[month].slice(1)}`);
  }
  return { from: null, to: null, label: "", past, invalid: false };
}

// Morning, lunch, afternoon or evening as [from, to) minutes after midnight, or null.
export function parseTimeOfDay(text) {
  if (/\b(tonight|evening|evenings|night|nights|after dark)\b/.test(text)) return { name: "evening", from: 17 * 60, to: 24 * 60 };
  if (/\b(lunch|lunchtime|noon|midday)\b/.test(text)) return { name: "around lunchtime", from: 11 * 60, to: 14 * 60 };
  if (/\b(afternoon|afternoons)\b/.test(text)) return { name: "afternoon", from: 12 * 60, to: 17 * 60 };
  if (/\b(morning|mornings|early)\b/.test(text)) return { name: "morning", from: 0, to: 12 * 60 };
  return null;
}

// Categories named in the question, in the order they appear in CATEGORY_WORDS.
export function parseCategories(text) {
  return Object.entries(CATEGORY_WORDS)
    .filter(([, words]) => words.some((word) => hasPhrase(text, word)))
    .map(([name]) => name);
}

// The building or venue a question names: { id, name } or null.
//  - locations: [{ id, building_name }]
// One-word names that are also topics ("Science", "Business") only count after
// "at", "in", "inside" or "near", so "computer science events" isn't a place.
export function parseLocation(text, locations) {
  const byName = new Map(locations.map((l) => [normalize(l.building_name), l]));
  const candidates = [
    ...locations.map((l) => [normalize(l.building_name), l]),
    ...Object.entries(PLACE_ALIASES).map(([alias, name]) => [alias, byName.get(normalize(name))]),
  ].filter(([, l]) => l);
  const found = candidates
    .filter(([phrase]) => {
      if (!phrase) return false;
      if (phrase.includes(" ")) return hasPhrase(text, phrase);
      return new RegExp(`\\b(at|in|inside|near|by) (the )?${phrase}\\b`).test(text);
    })
    .sort((a, b) => b[0].length - a[0].length)[0];
  return found ? { id: found[1].id, name: found[1].building_name, phrase: found[0] } : null;
}

export function parseIntent(text, { titles = [] } = {}) {
  if (/^(hi|hello|hey|hiya|good (morning|afternoon|evening)|whats up|how are you( doing)?)( allison)?$/.test(text)) return "greeting";
  if (/\b(what can you do|how do you work|help me use|who are you)\b/.test(text) || text === "help") return "help";
  if (/\b(weather|forecast|temperature|rain|homework|essay|stock|recipe)\b/.test(text) && !/\bevents?\b/.test(text)) return "unsupported";
  if (/\b(compare|comparison|versus|vs|difference between)\b/.test(text)) return "compare";
  if (/\b(summarize|summary|summaries|overview|recap|tell me about|describe|explain|what is .+ about|whats .+ about|highlights)\b/.test(text)) return "summary";
  if (titles.some((t) => t && text.includes(t)) && /\b(when|what time|where)\b/.test(text)) return "details";
  return "find";
}

// Everything the question asks for. `today` is a day key in campus time.
//  - locations: [{ id, building_name }]
//  - titles:    normalized event titles (to tell "summarize X" from a topic search)
export function parseQuestion(question, { today, locations = [], titles = [] }) {
  const text = normalize(question);
  const dates = parseDates(text, today);
  const location = parseLocation(text, locations);

  // Topic words: what's left after taking out filters, place and filler.
  let rest = location ? without(text, location.phrase) : text;
  rest = rest.replace(/\bweek of [a-z]+ \d{1,2}(st|nd|rd|th)?\b/g, " ")
    .replace(/\b[a-z]+ \d{1,2}(st|nd|rd|th)?\b/g, (match) => (monthIndex(match.split(" ")[0]) >= 0 ? " " : match))
    .replace(/\b\d{1,2}\/\d{1,2}\b/g, " ");
  const categories = parseCategories(rest);
  for (const name of categories) for (const word of CATEGORY_WORDS[name]) rest = without(rest, word);
  // Two-word topics ("machine learning") stay together as one term.
  const phrases = Object.keys(TOPIC_CATEGORY).filter((t) => t.includes(" ") && hasPhrase(rest, t));
  for (const phrase of phrases) rest = without(rest, phrase);
  const terms = [...phrases, ...rest.split(" ")].filter((w) =>
    w.length > 2 && !FILLER.has(w) && !/^\d+$/.test(w) &&
    monthIndex(w) < 0 && !WEEKDAYS.includes(w) && !WEEKDAYS.includes(w.replace(/s$/, "")),
  );

  return {
    text,
    intent: parseIntent(text, { titles }),
    dates,
    timeOfDay: parseTimeOfDay(text),
    categories,
    admission: /\bfree\b/.test(text) && !/\bfree time\b/.test(text) ? "free"
      : /\b(paid|ticketed|tickets?)\b/.test(text) ? "paid" : null,
    dropIn: /\b(no rsvp|without (an )?rsvp|drop in|dropin|walk in)\b/.test(text),
    wheelchair: /\b(wheelchair|accessible|accessibility)\b/.test(text),
    asl: /\b(asl|sign language|interpreter|interpreted)\b/.test(text),
    location,
    terms: [...new Set(terms)],
    // Categories the topic words belong to, used only if no event mentions them.
    topicCategories: [...new Set(terms.map(topicCategory).filter(Boolean))],
  };
}

// Does an event match the question's filters (everything but topic words)?
//  - categoryNames: the event's category names
export function matchesFilters(event, q, categoryNames, now = new Date()) {
  const start = toPacific(event.start_date_time);
  const end = new Date(event.end_date_time);
  // Past questions only show events that are over; everything else only
  // shows events that haven't ended (today shows what's left of today).
  if (q.dates.past ? end >= now : end <= now) return false;
  if (q.dates.from && (start.day < q.dates.from || start.day > q.dates.to)) return false;
  if (q.timeOfDay && (start.minutes < q.timeOfDay.from || start.minutes >= q.timeOfDay.to)) return false;
  if (q.categories.length && !q.categories.some((name) => categoryNames.includes(name))) return false;
  if (q.admission && event.admission_type !== q.admission) return false;
  if (q.dropIn && event.rsvp_required) return false;
  if (q.wheelchair && !event.wheelchair_accessible) return false;
  if (q.asl && !event.asl_available) return false;
  if (q.location && event.location_id !== q.location.id &&
    !normalize(event.room_number).includes(normalize(q.location.name))) return false;
  return true;
}

// How well an event matches the topic words (0 = not at all).
export function topicScore(event, terms) {
  const title = normalize(event.title);
  const body = `${normalize(event.description)} ${normalize(event.room_number)}`;
  let score = 0;
  for (const term of terms) {
    const forms = [term, term.replace(/(ies|es|s)$/, ""), `${term}s`].filter((f) => f.length > 2);
    if (forms.some((f) => hasPhrase(title, f))) score += 5;
    else if (forms.some((f) => hasPhrase(body, f))) score += 1;
  }
  return score;
}

// The category of a topic word ("concerts" -> Arts), or null.
function topicCategory(term) {
  return TOPIC_CATEGORY[term] ?? TOPIC_CATEGORY[term.replace(/(ies|es|s)$/, "")] ?? TOPIC_CATEGORY[term.replace(/s$/, "")] ?? null;
}

// The events that answer the question, best first:
// { events, ignoredTerms, usedCategories } — if no event mentions the topic
// words, the search falls back to their categories ("yoga" -> Health &
// Wellness, usedCategories lists them) or, failing that, drops the words
// (ignoredTerms lists them) so the student still sees events that fit the
// rest of the question.
//  - categoryNamesFor: (event) => [category names]
export function findEvents(allEvents, q, categoryNamesFor, now = new Date()) {
  const filtered = allEvents.filter((e) => matchesFilters(e, q, categoryNamesFor(e), now));
  const byTime = (a, b) => (q.dates.past
    ? Date.parse(b.start_date_time) - Date.parse(a.start_date_time)
    : Date.parse(a.start_date_time) - Date.parse(b.start_date_time));
  if (!q.terms.length) return { events: filtered.sort(byTime), ignoredTerms: [], usedCategories: [] };

  const scored = filtered
    .map((event) => ({ event, score: topicScore(event, q.terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byTime(a.event, b.event));
  if (scored.length) return { events: scored.map((x) => x.event), ignoredTerms: [], usedCategories: [] };

  const related = (q.topicCategories ?? []);
  if (related.length) {
    const inCategory = filtered.filter((e) => related.some((name) => categoryNamesFor(e).includes(name)));
    if (inCategory.length) return { events: inCategory.sort(byTime), ignoredTerms: q.terms, usedCategories: related };
  }
  return { events: filtered.sort(byTime), ignoredTerms: q.terms, usedCategories: [] };
}

// Did the question ask for anything specific (so an empty search means
// "nothing matches" rather than "I don't understand")?
export function hasFilters(q) {
  return Boolean(q.dates.from || q.dates.past || q.timeOfDay || q.categories.length || q.admission ||
    q.dropIn || q.wheelchair || q.asl || q.location);
}

// A readable description of the filters, e.g. "free technology events this week in the evening".
//  - terms: topic words to mention ("events about \"jazz\""), if they were used
export function describeQuery(q, terms = []) {
  const kinds = q.categories.length ? q.categories.map((c) => c.toLowerCase()).join(" or ") + " " : "";
  const words = [q.admission === "free" ? "free" : q.admission === "paid" ? "paid" : "", kinds + "events"]
    .filter(Boolean).join(" ");
  const parts = [words];
  if (terms.length) parts.push(`about "${terms.join(" ")}"`);
  if (q.location) parts.push(`at ${q.location.name}`);
  if (q.dates.label) parts.push(q.dates.label);
  else if (q.dates.past) parts.push("that already happened");
  if (q.timeOfDay) parts.push(q.timeOfDay.name === "around lunchtime" ? "around lunchtime" : `in the ${q.timeOfDay.name}`);
  const extras = [q.dropIn && "no RSVP needed", q.wheelchair && "wheelchair accessible", q.asl && "with ASL"]
    .filter(Boolean);
  if (extras.length) parts.push(`(${extras.join(", ")})`);
  return parts.join(" ");
}
