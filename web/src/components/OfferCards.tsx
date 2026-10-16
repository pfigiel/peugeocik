import { useMemo, useState } from "react";
import { ActionIcon, Badge, Card, Group, Image, Select, Stack, Text, Tooltip } from "@mantine/core";
import type { MatchRecord } from "../types";
import { type Dir, fmtNum, fmtPrice, type SortKey, SORT_OPTIONS, sortRecords } from "./matchSort";

export function OfferCards({ records }: { records: MatchRecord[] }) {
  const [sort, setSort] = useState<SortKey>("firstSeenAt");
  const [dir, setDir] = useState<Dir>("desc");
  const sorted = useMemo(() => sortRecords(records, sort, dir), [records, sort, dir]);

  return (
    <Stack gap="sm">
      <Group gap="xs" justify="flex-end">
        <Select
          size="xs"
          w={150}
          data={SORT_OPTIONS}
          value={sort}
          onChange={(v) => v && setSort(v as SortKey)}
          allowDeselect={false}
          aria-label="Sort by"
        />
        <Tooltip label={dir === "asc" ? "Ascending" : "Descending"}>
          <ActionIcon size="lg" variant="default" onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}>
            {dir === "asc" ? "▲" : "▼"}
          </ActionIcon>
        </Tooltip>
      </Group>

      {sorted.map(({ offer: o, firstSeenAt }) => (
        <Card key={o.uid} withBorder padding="sm" radius="md" component="a" href={o.url} target="_blank" rel="noreferrer">
          <Group align="flex-start" wrap="nowrap" gap="sm">
            <Image src={o.thumbnailUrl ?? undefined} w={110} h={82} radius="sm" fit="cover"
              fallbackSrc="https://placehold.co/110x82/1a1b1e/555?text=no+photo" alt={o.title} />
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Text fw={600} lineClamp={2} c="gray.1" size="sm">{o.title}</Text>
              <Text fw={700} c="indigo.3">{fmtPrice(o.price, o.currency)}</Text>
              <Group gap={6}>
                <Badge size="sm" variant="light" color="gray">{o.year ?? "—"}</Badge>
                <Badge size="sm" variant="light" color="gray">{fmtNum(o.mileageKm, " km")}</Badge>
                <Badge size="sm" variant="light" color="gray">{fmtNum(o.enginePowerHp, " KM")}</Badge>
                <Badge size="sm" variant="light" color="gray" tt="none">{o.fuelType ?? "—"}</Badge>
              </Group>
              <Text size="xs" c="dimmed">{o.location ?? "—"} · {new Date(firstSeenAt).toLocaleDateString("pl-PL")}</Text>
            </Stack>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
