import { useMemo } from "react";
import { Box, Card, Code, Group, Image, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { MatchRecord, Offer } from "../types";
import { type Dir, fmtNum, fmtPrice, type SortKey, sortRecords } from "./matchSort";

const FALLBACK = "https://placehold.co/300x200/141518/3a3a3a?text=brak+zdj%C4%99cia";

function specs(o: Offer): string[] {
  return [
    o.year ? String(o.year) : null,
    fmtNum(o.mileageKm, " km"),
    fmtNum(o.enginePowerHp, " KM"),
    fmtNum(o.engineCapacityCm3, " cm³"),
    o.fuelType,
    o.gearbox,
  ].filter((s): s is string => !!s && s !== "—");
}

function Price({ o }: { o: Offer }) {
  const [num] = fmtPrice(o.price, o.currency).split(" ");
  return (
    <Text span ff="monospace" fw={800} fz={26} lh={1} c="gray.0" style={{ whiteSpace: "nowrap" }}>
      {num} <Text span ff="monospace" fz="sm" c="dimmed" fw={600}>{o.currency ?? ""}</Text>
    </Text>
  );
}

function OfferCard({ rec, mobile }: { rec: MatchRecord; mobile: boolean }) {
  const o = rec.offer;
  const found = `Dodano ${new Date(rec.firstSeenAt).toLocaleDateString("pl-PL")}`;

  return (
    <Card
      component="a" href={o.url} target="_blank" rel="noreferrer"
      withBorder radius="lg" p={mobile ? "sm" : "md"}
      style={{ background: "var(--mantine-color-dark-6)", borderColor: "var(--mantine-color-dark-4)" }}
    >
      <Group align="flex-start" wrap="nowrap" gap="md">
        <Image src={o.thumbnailUrl ?? undefined} w={mobile ? 104 : 150} h={mobile ? 78 : 100}
          radius="md" fit="cover" fallbackSrc={FALLBACK} alt={o.title} />

        {mobile ? (
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700} lh={1.2} c="gray.0" lineClamp={2}>{o.title}</Text>
            <Text size="sm" c="dimmed">{o.location ?? "—"}</Text>
            <Price o={o} />
            <Text ff="monospace" size="xs" c="dimmed" lh={1.5}>{specs(o).join(" · ")}</Text>
            <Text size="xs" c="dimmed">{found}</Text>
          </Stack>
        ) : (
          <>
            <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
              <div>
                <Text fw={700} fz="lg" lh={1.2} c="gray.0" lineClamp={1}>{o.title}</Text>
                <Text size="sm" c="dimmed">{o.location ?? "—"}</Text>
              </div>
              <Group gap={6}>
                {specs(o).map((s, i) => <Code key={i} fz="xs">{s}</Code>)}
              </Group>
            </Stack>
            <Box style={{ textAlign: "right", flexShrink: 0 }}>
              <Price o={o} />
              <Text size="xs" c="dimmed" mt={6}>{found}</Text>
            </Box>
          </>
        )}
      </Group>
    </Card>
  );
}

export function MatchList({ records, sort, dir }: { records: MatchRecord[]; sort: SortKey; dir: Dir }) {
  const mobile = useMediaQuery("(max-width: 48em)") ?? false;
  const sorted = useMemo(() => sortRecords(records, sort, dir), [records, sort, dir]);

  if (records.length === 0) {
    return <Text c="dimmed" py="xl" ta="center">Brak wyników. Zmień kryteria i kliknij „Skanuj teraz”.</Text>;
  }
  return (
    <Stack gap="sm">
      {sorted.map((r) => <OfferCard key={r.offer.uid} rec={r} mobile={mobile} />)}
    </Stack>
  );
}
