import { Text } from "@mantine/core";

/** Fixed-aspect photo. The image is shown whole (contain); any leftover space is
 *  filled with a blurred, zoomed copy of the same image so every card matches. */
export function PhotoBox({ src, alt, w, h }: { src: string | null; alt: string; w: number; h: number }) {
  const base: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: "var(--mantine-radius-md)",
    flexShrink: 0,
    overflow: "hidden",
  };

  if (!src) {
    return (
      <div style={{ ...base, background: "var(--mantine-color-dark-7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text size="xs" c="dimmed">brak zdjęcia</Text>
      </div>
    );
  }

  return (
    <div style={{ ...base, position: "relative", background: "#000" }}>
      <img
        src={src}
        alt=""
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(10px)", transform: "scale(1.25)" }}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
