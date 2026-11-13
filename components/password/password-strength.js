"use client";

import { validatePassword, requirementLabels } from "@/lib/password/password-validation";

export default function PasswordStrength({ password }) {
  const requirements = validatePassword(password);

  const strength = Object.values(requirements).filter(Boolean).length;

  const strengthLabel = !password
    ? "Not entered"
    : strength <= 2
      ? "Weak"
      : strength === 3
        ? "Fair"
        : strength === 4
          ? "Strong"
          : "Very strong";

  const strengthColor =
    strength <= 2
      ? "#DC2626"
      : strength === 3
        ? "#D97706"
        : strength === 4
          ? "#2563EB"
          : "#16A34A";

  return (
    <div className="ga-muted ga-small">
      <div style={{ marginTop: "8px", marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <strong>Password strength</strong>

          <span
            style={{
              color: password ? strengthColor : "inherit",
              fontWeight: "600",
            }}
          >
            {strengthLabel}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Password strength"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={strength}
          style={{
            display: "flex",
            gap: "5px",
            width: "100%",
          }}
        >
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              style={{
                height: "6px",
                flex: 1,
                borderRadius: "4px",
                backgroundColor:
                  strength >= level ? strengthColor : "#D1D5DB",
                transition: "background-color 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>

      <p>Your password must contain:</p>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {requirementLabels.map(([key, label]) => (
          <li
            key={key}
            style={{
              color: requirements[key] ? "#16A34A" : "inherit",
              marginBottom: "4px",
            }}
          >
            {requirements[key] ? "✓" : "○"} {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
