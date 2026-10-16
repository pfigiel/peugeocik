import { Box } from "@mantine/core";

/** Amber rounded-square app mark with a car glyph, matching the design. */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "var(--mantine-color-amber-5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none"
        stroke="#1a1205" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
        <path d="M3 11h18v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        <circle cx="7.5" cy="14" r="0.6" fill="#1a1205" />
        <circle cx="16.5" cy="14" r="0.6" fill="#1a1205" />
      </svg>
    </Box>
  );
}
