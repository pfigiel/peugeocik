import { useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import type { Session } from "@supabase/supabase-js";
import { api } from "./api";
import { supabase } from "./supabase";
import type { Config, MatchRecord, Meta, ScanResult } from "./types";
import { CriteriaForm } from "./components/CriteriaForm";
import { MatchList } from "./components/MatchList";
import { Logo } from "./components/Logo";
import { type Dir, type SortKey, SORT_OPTIONS } from "./components/matchSort";

export function App({ session }: { session: Session }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>("results");
  const [sort, setSort] = useState<SortKey>("firstSeenAt");
  const [dir, setDir] = useState<Dir>("desc");

  useEffect(() => {
    Promise.all([api.getMeta(), api.getConfig(), api.getMatches()])
      .then(([m, c, r]) => {
        setMeta(m);
        setConfig(c);
        setMatches(r);
      })
      .catch((e) => setError(e.message));
  }, []);

  const save = async (next: Config) => {
    setSaving(true);
    setError(null);
    try {
      setConfig(await api.saveConfig(next));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const scan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await api.scan();
      setLastScan(res.results);
      setMatches(await api.getMatches());
      setTab("results");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  if (error && !config) {
    return (
      <Container py="xl">
        <Alert color="red" title="Brak połączenia z backendem">{error}</Alert>
      </Container>
    );
  }
  if (!meta || !config) return <Group justify="center" mt={120}><Loader /></Group>;

  const portals = config.searches[0].portals.join(", ");
  const lastScanText = lastScan
    ? "Ostatni skan: " + lastScan.map((r) =>
        r.error ? `${r.portal}: błąd` : `${r.portal} · ${r.scraped} pobrane · ${r.matched} dopasowane · ${r.new} nowych`,
      ).join(" · ")
    : "Jeszcze nie skanowano — kliknij „Skanuj teraz”.";

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Logo />
            <div style={{ minWidth: 0 }}>
              <Title order={3} lh={1.1}>peugeocik</Title>
              <Text size="sm" c="dimmed" lineClamp={1}>Monitor ofert samochodowych — {portals}</Text>
            </div>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Badge color="amber" variant="light" size="lg" radius="sm" tt="none" visibleFrom="sm">{matches.length} ofert</Badge>
            <Button onClick={scan} loading={scanning}>Skanuj teraz</Button>
            <Text size="sm" c="dimmed" visibleFrom="lg">{session.user.email}</Text>
            <Button variant="default" onClick={() => supabase.auth.signOut()} visibleFrom="sm">Wyloguj</Button>
          </Group>
        </Group>

        {/* Last-scan bar */}
        <Paper radius="md" px="md" py="sm" style={{ background: "var(--mantine-color-dark-6)", border: "1px solid var(--mantine-color-dark-4)" }}>
          <Text size="sm" c="dimmed">{lastScanText}</Text>
        </Paper>

        {error && <Alert color="red" withCloseButton onClose={() => setError(null)}>{error}</Alert>}

        <Tabs value={tab} onChange={setTab} variant="pills" color="dark" keepMounted={false}>
          <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
            <Tabs.List>
              <Tabs.Tab value="results">
                <Group gap={8} wrap="nowrap">Wyniki <Badge size="sm" color="amber" variant="light">{matches.length}</Badge></Group>
              </Tabs.Tab>
              <Tabs.Tab value="criteria">Kryteria</Tabs.Tab>
            </Tabs.List>

            {tab === "results" && (
              <Group gap="xs" wrap="nowrap">
                <Text size="sm" c="dimmed">Sortuj</Text>
                <Select w={150} data={SORT_OPTIONS} value={sort} onChange={(v) => v && setSort(v as SortKey)} allowDeselect={false} />
                <ActionIcon size="lg" variant="default" onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))} aria-label="Kierunek sortowania">
                  {dir === "asc" ? "▲" : "▼"}
                </ActionIcon>
              </Group>
            )}
          </Group>

          <Tabs.Panel value="results">
            <MatchList records={matches} sort={sort} dir={dir} />
          </Tabs.Panel>

          <Tabs.Panel value="criteria">
            <CriteriaForm config={config} meta={meta} saving={saving} onSave={save} />
          </Tabs.Panel>
        </Tabs>

        {/* Footer (mobile sign-out) */}
        <Group justify="space-between" hiddenFrom="sm" pt="md" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
          <Text size="sm" c="dimmed">{session.user.email}</Text>
          <Button variant="default" size="sm" onClick={() => supabase.auth.signOut()}>Wyloguj</Button>
        </Group>
      </Stack>
    </Container>
  );
}
