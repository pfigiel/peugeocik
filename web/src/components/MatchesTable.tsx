import { useMemo, useState } from "react";
import { Anchor, Badge, Group, Image, Table, Text, UnstyledButton } from "@mantine/core";
import type { MatchRecord } from "../types";

type SortKey = "price" | "year" | "mileageKm" | "enginePowerHp" | "firstSeenAt";
type Dir = "asc" | "desc";

interface Props {
  records: MatchRecord[];
}

function value(r: MatchRecord, key: SortKey): number {
  if (key === "firstSeenAt") return new Date(r.firstSeenAt).getTime();
  const v = r.offer[key];
  return v ?? Number.NEGATIVE_INFINITY; // nulls sort last on desc, first on asc
}

const nf = new Intl.NumberFormat("pl-PL");
const fmt = (v: number | null, suffix = "") => (v === null ? "—" : `${nf.format(v)}${suffix}`);

export function MatchesTable({ records }: Props) {
  const [sort, setSort] = useState<SortKey>("firstSeenAt");
  const [dir, setDir] = useState<Dir>("desc");

  const sorted = useMemo(() => {
    const arr = [...records];
    arr.sort((a, b) => (dir === "asc" ? value(a, sort) - value(b, sort) : value(b, sort) - value(a, sort)));
    return arr;
  }, [records, sort, dir]);

  const toggle = (key: SortKey) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir("asc");
    }
  };

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <Table.Th>
      <UnstyledButton onClick={() => toggle(k)} style={{ fontWeight: 600, fontSize: "inherit" }}>
        <Group gap={4} wrap="nowrap">
          {label}
          <Text span c="dimmed">{sort === k ? (dir === "asc" ? "▲" : "▼") : "↕"}</Text>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );

  if (records.length === 0) {
    return <Text c="dimmed">No matches yet. Adjust criteria and hit “Scan now”.</Text>;
  }

  return (
    <Table.ScrollContainer minWidth={900}>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Photo</Table.Th>
            <Table.Th>Car</Table.Th>
            <Th k="price" label="Price" />
            <Th k="year" label="Year" />
            <Th k="mileageKm" label="Mileage" />
            <Th k="enginePowerHp" label="Power" />
            <Table.Th>Engine</Table.Th>
            <Table.Th>Fuel</Table.Th>
            <Table.Th>Gearbox</Table.Th>
            <Th k="firstSeenAt" label="Found" />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sorted.map(({ offer: o, firstSeenAt }) => (
            <Table.Tr key={o.uid}>
              <Table.Td>
                <Anchor href={o.url} target="_blank" rel="noreferrer">
                  <Image src={o.thumbnailUrl ?? undefined} w={120} h={90} radius="sm" fit="cover" fallbackSrc="https://placehold.co/120x90?text=no+photo" alt={o.title} />
                </Anchor>
              </Table.Td>
              <Table.Td maw={280}>
                <Anchor href={o.url} target="_blank" rel="noreferrer" fw={600} lineClamp={2}>
                  {o.title}
                </Anchor>
                <Text size="xs" c="dimmed">{o.location ?? "—"}</Text>
              </Table.Td>
              <Table.Td><Text fw={600} style={{ whiteSpace: "nowrap" }}>{fmt(o.price, ` ${o.currency ?? ""}`)}</Text></Table.Td>
              <Table.Td>{o.year ?? "—"}</Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>{fmt(o.mileageKm, " km")}</Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>{fmt(o.enginePowerHp, " KM")}</Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>{fmt(o.engineCapacityCm3, " cm³")}</Table.Td>
              <Table.Td><Badge variant="light" tt="none">{o.fuelType ?? "—"}</Badge></Table.Td>
              <Table.Td>{o.gearbox ?? "—"}</Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}><Text size="xs">{new Date(firstSeenAt).toLocaleDateString("pl-PL")}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
