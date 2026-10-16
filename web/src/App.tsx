import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Paper,
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
import { MatchesTable } from "./components/MatchesTable";

export function App({ session }: { session: Session }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>("results");

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
        <Alert color="red" title="Cannot reach API">{error}<br />Is the backend running? <code>npm run serve</code></Alert>
      </Container>
    );
  }

  if (!meta || !config) {
    return (
      <Group justify="center" mt={120}><Loader /></Group>
    );
  }

  const newFound = lastScan?.reduce((s, r) => s + r.new, 0) ?? 0;

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>🚗 peugeocik</Title>
            <Text c="dimmed" size="sm">Car offer monitor — {config.searches[0].portals.join(", ")}</Text>
          </div>
          <Group>
            <Badge size="lg" variant="light">{matches.length} matches</Badge>
            <Button onClick={scan} loading={scanning}>Scan now</Button>
            <Group gap="xs">
              <Text size="sm" c="dimmed" visibleFrom="sm">{session.user.email}</Text>
              <Button variant="subtle" color="gray" onClick={() => supabase.auth.signOut()}>Sign out</Button>
            </Group>
          </Group>
        </Group>

        {error && <Alert color="red" withCloseButton onClose={() => setError(null)}>{error}</Alert>}
        {lastScan && (
          <Alert color={newFound > 0 ? "teal" : "gray"} variant="light">
            Last scan: {lastScan.map((r) => `${r.portal} ${r.scraped} scraped / ${r.matched} match / ${r.new} new`).join(" · ")}
          </Alert>
        )}

        <Tabs value={tab} onChange={setTab} keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="criteria">Criteria</Tabs.Tab>
            <Tabs.Tab value="results">
              <Group gap="xs">
                Results
                <Badge size="sm" variant="light" circle>{matches.length}</Badge>
              </Group>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="criteria">
            <Paper withBorder radius="md" p="md">
              <CriteriaForm config={config} meta={meta} saving={saving} onSave={save} />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="results">
            <Paper withBorder radius="md" p="md">
              <MatchesTable records={matches} />
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
