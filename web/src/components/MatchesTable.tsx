import { useMemo, useState } from "react";
import { Anchor, Badge, Group, Image, Table, Text, UnstyledButton } from "@mantine/core";
import type { MatchRecord } from "../types";
import { type Dir, fmtNum, fmtPrice, type SortKey, sortRecords } from "./matchSort";

export function MatchesTable({ records }: { records: MatchRecord[] }) {
  const [sort, setSort] = useState<SortKey>("firstSeenAt");
  const [dir, setDir] = useState<Dir>("desc");

  const sorted = useMemo(() => sortRecords(records, sort, dir), [records, sort, dir]);

  const toggle = (key: SortKey) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(key); setDir(key === "firstSeenAt" || key === "price" ? "desc" : "asc"); }
  };

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <Table.Th>
      <UnstyledButton onClick={() => toggle(k)} style={{ fontWeight: 600, fontSize: "inherit", whiteSpace: "nowrap" }}>
        <Group gap={4} wrap="nowrap">
          {label}
          <Text span c={sort === k ? "indigo.4" : "dimmed"} fz="xs">{sort === k ? (dir === "asc" ? "▲" : "▼") : "↕"}</Text>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );

  return (
    <Table.ScrollContainer minWidth={820}>
      <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md" stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={132}>Photo</Table.Th>
            <Table.Th>Car</Table.Th>
            <Th k="price" label="Price" />
            <Th k="year" label="Year" />
            <Th k="mileageKm" label="Mileage" />
            <Th k="enginePowerHp" label="Power" />
            <Table.Th>Engine</Table.Th>
            <Table.Th>Fuel</Table.Th>
            <Th k="firstSeenAt" label="Found" />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sorted.map(({ offer: o, firstSeenAt }) => (
            <Table.Tr key={o.uid}>
              <Table.Td>
                <Anchor href={o.url} target="_blank" rel="noreferrer">
                  <Image src={o.thumbnailUrl ?? undefined} w={116} h={84} radius="sm" fit="cover"
                    fallbackSrc="https://placehold.co/116x84/1a1b1e/555?text=no+photo" alt={o.title} />
                </Anchor>
              </Table.Td>
              <Table.Td maw={260}>
                <Anchor href={o.url} target="_blank" rel="noreferrer" fw={600} lineClamp={2} c="gray.1">{o.title}</Anchor>
                <Text size="xs" c="dimmed">{o.location ?? "—"}</Text>
              </Table.Td>
              <Table.Td><Text fw={700} c="indigo.3" style={{ whiteSpace: "nowrap" }}>{fmtPrice(o.price, o.currency)}</Text></Table.Td>
              <Table.Td>{o.year ?? "—"}</Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>{fmtNum(o.mileageKm, " km")}</Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>{fmtNum(o.enginePowerHp, " KM")}</Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>{fmtNum(o.engineCapacityCm3, " cm³")}</Table.Td>
              <Table.Td><Badge variant="light" tt="none" color="gray">{o.fuelType ?? "—"}</Badge></Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}><Text size="xs" c="dimmed">{new Date(firstSeenAt).toLocaleDateString("pl-PL")}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
