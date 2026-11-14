// src/components/kalpad/KalPadProgress.jsx
"use client";

export function KalPadProgress({
  progress,
  value,
  height = 6,
  fillColor,
  color,
  trackColor = "var(--kp-raised)",
  showPercentage = false,
  className = "",
  ariaLabel,
}) {
  const normalized =
    typeof progress === "number" && Number.isFinite(progress)
      ? progress
      : typeof value === "number" && Number.isFinite(value)
        ? value / 100
        : 0;
  const clamped = Math.max(0, Math.min(1, normalized));
  const pct = Math.round(clamped * 100);
  const resolvedFill = fillColor || color || "var(--kp-primary)";

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: showPercentage ? "10px" : 0,
        width: "100%",
      }}
    >
      <div
        role="progressbar"
        aria-label={ariaLabel || "Progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{
          flex: 1,
          height: `${height}px`,
          borderRadius: "999px",
          backgroundColor: trackColor,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "999px",
            backgroundColor: resolvedFill,
            transition: "width 400ms var(--kp-ease-enter)",
          }}
        />
      </div>
      {showPercentage && (
        <span
          style={{
            fontFamily: "var(--font-kp-mono)",
            fontWeight: 700,
            fontSize: "12px",
            lineHeight: 1.3,
            color: "var(--kp-ink)",
            fontVariantNumeric: "tabular-nums",
            minWidth: "36px",
            textAlign: "right",
          }}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
