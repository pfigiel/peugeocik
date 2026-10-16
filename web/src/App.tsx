import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
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
import { MatchesView } from "./components/MatchesView";

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
        <Alert color="red" title="Cannot reach backend">{error}</Alert>
      </Container>
    );
  }

  if (!meta || !config) {
    return <Group justify="center" mt={120}><Loader /></Group>;
  }

  const newFound = lastScan?.reduce((s, r) => s + r.new, 0) ?? 0;

  return (
    <>
      <Box
        component="header"
        style={(t) => ({
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--mantine-color-dark-7)",
          borderBottom: `1px solid ${t.colors.dark[4]}`,
          backdropFilter: "blur(6px)",
        })}
      >
        <Container size="lg" py="sm">
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text fz={26} lh={1}>🚗</Text>
              <div style={{ minWidth: 0 }}>
                <Title order={4} lh={1.1}>peugeocik</Title>
                <Text size="xs" c="dimmed" visibleFrom="xs">Car offer monitor</Text>
              </div>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Button onClick={scan} loading={scanning} size="sm">Scan now</Button>
              <Text size="sm" c="dimmed" visibleFrom="md">{session.user.email}</Text>
              <Button variant="subtle" color="gray" size="sm" onClick={() => supabase.auth.signOut()}>
                Sign out
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      <Container size="lg" py="lg">
        <Stack gap="md">
          {error && <Alert color="red" withCloseButton onClose={() => setError(null)}>{error}</Alert>}
          {lastScan && (
            <Alert color={newFound > 0 ? "teal" : "gray"} variant="light" withCloseButton onClose={() => setLastScan(null)}>
              {newFound > 0 ? `${newFound} new offer(s) found. ` : "No new offers. "}
              <Text span c="dimmed" size="sm">
                {lastScan.map((r) => `${r.portal}: ${r.matched} match`).join(" · ")}
              </Text>
            </Alert>
          )}

          <Tabs value={tab} onChange={setTab} variant="default" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="results">
                <Group gap="xs" wrap="nowrap">
                  Results
                  <Badge size="sm" variant="light" circle>{matches.length}</Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="criteria">Criteria</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="results">
              <Paper withBorder radius="md" p={{ base: "xs", sm: "md" }}>
                <MatchesView records={matches} />
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="criteria">
              <Paper withBorder radius="md" p={{ base: "sm", sm: "md" }}>
                <CriteriaForm config={config} meta={meta} saving={saving} onSave={save} />
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>
    </>
  );
}
