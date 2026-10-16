/*
 * lib/map/sample-events.js
 *
 * PURPOSE: 
 * Provides hardcoded demo events for the Map when someone opens /map?sample=1. 
 * This lets our team test and demonstrate the map even when there are not enough real events in Supabase.
 * 
 */

// SAMPLE_3D_ROOMS stores the names of the scanned rooms displayed in the map's 3D scan information card. 
// The sample() helper creates consistent event objects and fills in default values shared by the demo events.
export const SAMPLE_3D_ROOMS = {
  seic: "SEIC 200 · Research Lab",
  ccsc: "Level 1",
  lib: "Library 121 · Study Commons",
  gym: "Main Gym",
};

// Creates a sample event using the same structure as a real event. 
// Shared fields receive default values, while the event-specific data passed in can override those defaults. 
// If no endDate is provided, the event is assumed to end on the same day it starts. 
const sample = (mapId, event) => ({
  roomNumber: "",
  locationName: null,
  venueId: null,
  has3D: Boolean(SAMPLE_3D_ROOMS[mapId]),
  mapId,
  ...event,
  endDate: event.endDate ?? event.date,
});

export const SAMPLE_EVENTS = [
  // Group demo events by the building or outdoor space where they take place.
  // venueId identifies a specific room or venue when one is provided. 
  // events without one are associated with the building as a whole.
  // These examples let our team test how events appear for different map locations, including locations with multiple events or specific venues.
  sample("seic", { id: "event-1", title: "AI & Tech Networking Night", date: "2026-10-16", startTime: "5:30 PM", endTime: "7:00 PM", tags: ["Networking", "Tech", "AI"], rsvpCount: 24 }),
  sample("seic", { id: "event-2", title: "Intro to Machine Learning", date: "2026-10-19", startTime: "12:00 PM", endTime: "1:30 PM", tags: ["Tech", "AI"], rsvpCount: 48 }),

  // Cesar Chavez Student Center (events grouped by room in the side panel)
  sample("ccsc", { id: "event-3", title: "Career Fair", date: "2026-10-14", startTime: "11:30 AM", endTime: "3:30 PM", tags: ["Networking", "Career"], rsvpCount: 350, venueId: "jack-adams" }),
  sample("ccsc", { id: "event-8", title: "Textbook Buyback Week", date: "2026-10-21", startTime: "10:00 AM", endTime: "4:00 PM", tags: ["Academic"], rsvpCount: 41, venueId: "bookstore" }),
  sample("ccsc", { id: "event-9", title: "Gator Merch Pop-Up", date: "2026-10-22", startTime: "12:00 PM", endTime: "2:00 PM", tags: ["Social"], rsvpCount: 28, venueId: "bookstore" }),
  sample("ccsc", { id: "event-10", title: "Poster Printing Drop-In", date: "2026-10-16", startTime: "1:00 PM", endTime: "3:00 PM", tags: ["Academic", "Clubs"], rsvpCount: 15, venueId: "copy-center" }),
  sample("ccsc", { id: "event-11", title: "Student Org Leaders Meetup", date: "2026-10-18", startTime: "5:00 PM", endTime: "6:30 PM", tags: ["Clubs", "Networking"], rsvpCount: 54 }),

  // J. Paul Leonard Library
  sample("lib", { id: "event-4", title: "Midterm Study Jam", date: "2026-10-20", startTime: "6:00 PM", endTime: "9:00 PM", tags: ["Academic", "Study"], rsvpCount: 67 }),

  // Gymnasium
  sample("gym", { id: "event-5", title: "Intramural Basketball Kickoff", date: "2026-10-17", startTime: "4:00 PM", endTime: "6:00 PM", tags: ["Sports", "Social"], rsvpCount: 82 }),

  // Quad
  sample("quad", { id: "event-6", title: "Fall Club Fair", date: "2026-10-15", startTime: "11:00 AM", endTime: "2:00 PM", tags: ["Clubs", "Social"], rsvpCount: 210 }),
  sample("quad", { id: "event-7", title: "Outdoor Movie Night", date: "2026-10-23", startTime: "7:00 PM", endTime: "9:30 PM", tags: ["Social", "Free food"], rsvpCount: 95 }),
];
