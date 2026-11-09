/*
 * components/gatoraid/Logo.js
 *
 * PURPOSE:
 * The GatorAid mark: a campus map pin with a gator's eyes peeking over the
 * top, glancing sideways at the gold dot (the event you're headed to).
 * Purple and gold are the SFSU colors. The same drawing is the browser tab
 * icon (app/icon.svg).
 */

export default function Logo({ size = 30, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="#5b3f94" />
      {/* Gator eyes peeking over the pin, glancing to the side */}
      <circle cx="11.4" cy="7.4" r="3.2" fill="#fff" />
      <circle cx="20.6" cy="7.4" r="3.2" fill="#fff" />
      <circle cx="12.4" cy="7.2" r="1.4" fill="#2b1f47" />
      <circle cx="21.6" cy="7.2" r="1.4" fill="#2b1f47" />
      <circle cx="12.9" cy="6.65" r="0.45" fill="#fff" />
      <circle cx="22.1" cy="6.65" r="0.45" fill="#fff" />
      {/* Map pin, outlined in purple so it sits in front of the eyes */}
      <path
        d="M16 28.4c-.4 0-8-7.1-8-12.4a8 8 0 0 1 16 0c0 5.3-7.6 12.4-8 12.4Z"
        fill="#fff"
        stroke="#5b3f94"
        strokeWidth="1.5"
        paintOrder="stroke"
      />
      {/* Event dot */}
      <circle cx="16" cy="16" r="3.3" fill="#e3b23c" />
    </svg>
  );
}
