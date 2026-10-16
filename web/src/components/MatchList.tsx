import { useMemo } from "react";
import { ActionIcon, Box, Card, Code, Divider, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { MatchRecord, Offer } from "../types";
import { type Dir, fmtNum, fmtPrice, type SortKey, sortRecords } from "./matchSort";
import { PhotoBox } from "./PhotoBox";

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

function ArchiveIcon({ restore }: { restore: boolean }) {
  return restore ? (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h18M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M4 6h16a1 1 0 0 1 1 1v3H3V7a1 1 0 0 1 1-1z" />
      <path d="M12 17v-4M12 13l-2 2M12 13l2 2" />
    </svg>
  ) : (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16a1 1 0 0 1 1 1v3H3V7a1 1 0 0 1 1-1z" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M9 14h6" />
    </svg>
  );
}

function OfferCard({ rec, mobile, onArchive }: { rec: MatchRecord; mobile: boolean; onArchive: (uid: string, archived: boolean) => void }) {
  const o = rec.offer;
  const found = `Dodano ${new Date(rec.firstSeenAt).toLocaleDateString("pl-PL")}`;

  const archiveBtn = (
    <Tooltip label={rec.archived ? "Przywróć" : "Archiwizuj"} withArrow>
      <ActionIcon
        variant="subtle" color="gray" size="md"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(o.uid, !rec.archived); }}
        aria-label={rec.archived ? "Przywróć" : "Archiwizuj"}
      >
        <ArchiveIcon restore={rec.archived} />
      </ActionIcon>
    </Tooltip>
  );

  return (
    <Card
      component="a" href={o.url} target="_blank" rel="noreferrer"
      withBorder radius="lg" p={mobile ? "sm" : "md"}
      style={{
        background: "var(--mantine-color-dark-6)",
        borderColor: "var(--mantine-color-dark-4)",
        opacity: rec.archived ? 0.55 : 1,
        position: "relative",
      }}
    >
      <Group align="flex-start" wrap="nowrap" gap="md">
        <Box style={{ filter: rec.archived ? "grayscale(1)" : undefined }}>
          <PhotoBox src={o.thumbnailUrl} alt={o.title} w={mobile ? 104 : 150} h={mobile ? 70 : 100} />
        </Box>

        {mobile ? (
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" wrap="nowrap" align="flex-start" gap={4}>
              <Text fw={700} lh={1.2} c="gray.0" lineClamp={2}>{o.title}</Text>
              {archiveBtn}
            </Group>
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
              <Group gap={6}>{specs(o).map((s, i) => <Code key={i} fz="xs">{s}</Code>)}</Group>
            </Stack>
            <Box style={{ textAlign: "right", flexShrink: 0 }}>
              <Group gap={6} justify="flex-end" wrap="nowrap" align="center">
                <Price o={o} />
                {archiveBtn}
              </Group>
              <Text size="xs" c="dimmed" mt={6}>{found}</Text>
            </Box>
          </>
        )}
      </Group>
    </Card>
  );
}

export function MatchList({
  records, sort, dir, onArchive,
}: { records: MatchRecord[]; sort: SortKey; dir: Dir; onArchive: (uid: string, archived: boolean) => void }) {
  const mobile = useMediaQuery("(max-width: 48em)") ?? false;

  const { active, archived } = useMemo(() => {
    const a = sortRecords(records.filter((r) => !r.archived), sort, dir);
    const z = sortRecords(records.filter((r) => r.archived), sort, dir);
    return { active: a, archived: z };
  }, [records, sort, dir]);

  if (records.length === 0) {
    return <Text c="dimmed" py="xl" ta="center">Brak wyników. Zmień kryteria i kliknij „Skanuj teraz”.</Text>;
  }

  return (
    <Stack gap="sm">
      {active.map((r) => <OfferCard key={r.offer.uid} rec={r} mobile={mobile} onArchive={onArchive} />)}
      {active.length === 0 && (
        <Text c="dimmed" py="md" ta="center">Wszystkie oferty zarchiwizowane.</Text>
      )}
      {archived.length > 0 && (
        <>
          <Divider my="sm" label={`Zarchiwizowane (${archived.length})`} labelPosition="center" />
          {archived.map((r) => <OfferCard key={r.offer.uid} rec={r} mobile={mobile} onArchive={onArchive} />)}
        </>
      )}
    </Stack>
  );
}
