import { Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { MatchRecord } from "../types";
import { MatchesTable } from "./MatchesTable";
import { OfferCards } from "./OfferCards";

export function MatchesView({ records }: { records: MatchRecord[] }) {
  const isMobile = useMediaQuery("(max-width: 48em)");

  if (records.length === 0) {
    return <Text c="dimmed">No matches yet. Adjust criteria and hit “Scan now”.</Text>;
  }
  return isMobile ? <OfferCards records={records} /> : <MatchesTable records={records} />;
}
