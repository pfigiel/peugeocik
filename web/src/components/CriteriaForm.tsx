import { useState } from "react";
import {
  Button,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  TextInput,
  Title,
} from "@mantine/core";
import type { Config, Criteria, Meta } from "../types";
import { toOptions } from "../labels";

interface Props {
  config: Config;
  meta: Meta;
  saving: boolean;
  onSave: (config: Config) => void;
}

function num(v: number | string): number | undefined {
  return v === "" || v === undefined ? undefined : Number(v);
}

/** Amber chips, matching the design. */
const pillStyles = {
  pill: {
    background: "var(--mantine-color-amber-light)",
    color: "var(--mantine-color-amber-2)",
    fontWeight: 600,
  },
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper radius="lg" p="lg" style={{ background: "var(--mantine-color-dark-6)", border: "1px solid var(--mantine-color-dark-4)" }}>
      <Title order={4} mb="md">{title}</Title>
      {children}
    </Paper>
  );
}

export function CriteriaForm({ config, meta, saving, onSave }: Props) {
  const search = config.searches[0];
  const [intervalMinutes, setInterval] = useState<number | string>(config.intervalMinutes);
  const [c, setC] = useState<Criteria>(search.criteria);
  const [city, setCity] = useState(search.criteria.location?.city ?? "");
  const [radius, setRadius] = useState<number | string>(search.criteria.location?.radiusKm ?? "");
  const [notifyEmails, setNotifyEmails] = useState<string[]>(config.notifyEmails ?? []);

  const set = <K extends keyof Criteria>(key: K, value: Criteria[K]) => setC((p) => ({ ...p, [key]: value }));

  const submit = () => {
    const location = city.trim() && radius !== "" ? { city: city.trim(), radiusKm: Number(radius) } : undefined;
    onSave({
      ...config,
      intervalMinutes: Number(intervalMinutes) || config.intervalMinutes,
      notifyEmails: notifyEmails.map((e) => e.trim()).filter(Boolean),
      searches: [{ ...search, criteria: { ...c, location } }],
    });
  };

  return (
    <Stack gap="lg">
      <Section title="Pojazd">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <TextInput label="Marka" placeholder="dowolna" value={c.make ?? ""} onChange={(e) => set("make", e.currentTarget.value || undefined)} />
          <TextInput label="Model" placeholder="dowolny" value={c.model ?? ""} onChange={(e) => set("model", e.currentTarget.value || undefined)} />
          <MultiSelect label="Paliwo" data={toOptions(meta.fuelTypes)} value={c.fuelTypes ?? []} onChange={(v) => set("fuelTypes", v.length ? v : undefined)} styles={pillStyles} clearable />
          <MultiSelect label="Skrzynia" data={toOptions(meta.gearbox)} value={c.gearbox ?? []} onChange={(v) => set("gearbox", v.length ? v : undefined)} styles={pillStyles} clearable />
          <MultiSelect label="Nadwozie" data={toOptions(meta.bodyTypes)} value={c.bodyTypes ?? []} onChange={(v) => set("bodyTypes", v.length ? v : undefined)} styles={pillStyles} clearable />
        </SimpleGrid>
      </Section>

      <Section title="Zakresy">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <NumberInput label="Cena min (PLN)" value={c.priceMin ?? ""} onChange={(v) => set("priceMin", num(v))} thousandSeparator=" " min={0} />
          <NumberInput label="Cena maks (PLN)" value={c.priceMax ?? ""} onChange={(v) => set("priceMax", num(v))} thousandSeparator=" " min={0} />
          <NumberInput label="Rok min" value={c.yearMin ?? ""} onChange={(v) => set("yearMin", num(v))} min={1950} max={2030} />
          <NumberInput label="Rok maks" value={c.yearMax ?? ""} onChange={(v) => set("yearMax", num(v))} min={1950} max={2030} />
          <NumberInput label="Przebieg maks (km)" value={c.mileageMax ?? ""} onChange={(v) => set("mileageMax", num(v))} thousandSeparator=" " min={0} />
          <NumberInput label="Pojemność min (cm³)" value={c.engineCapacityMin ?? ""} onChange={(v) => set("engineCapacityMin", num(v))} min={0} />
          <NumberInput label="Moc min (KM)" value={c.enginePowerMin ?? ""} onChange={(v) => set("enginePowerMin", num(v))} min={0} />
        </SimpleGrid>
      </Section>

      <Section title="Stan i lokalizacja">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" verticalSpacing="lg">
          <TextInput label="W pobliżu miasta" placeholder="np. Gliwice" value={city} onChange={(e) => setCity(e.currentTarget.value)} />
          <NumberInput label="Promień (km)" value={radius} onChange={setRadius} min={0} />
          <Switch label="Tylko nieuszkodzone" mt={{ base: 0, md: "xl" }} checked={!!c.excludeDamaged} onChange={(e) => set("excludeDamaged", e.currentTarget.checked || undefined)} />
          <Switch label="Zarejestrowany w PL" mt={{ base: 0, md: "xl" }} checked={!!c.registeredInPL} onChange={(e) => set("registeredInPL", e.currentTarget.checked || undefined)} />
        </SimpleGrid>
      </Section>

      <Section title="Powiadomienia">
        <TagsInput
          label="Adresy e-mail odbiorców"
          description="Każdy nowy wynik trafia na te adresy. Puste = adres domyślny (NOTIFY_EMAIL_TO)."
          placeholder="wpisz adres i Enter"
          value={notifyEmails}
          onChange={setNotifyEmails}
          splitChars={[",", " ", ";"]}
          clearable
          styles={pillStyles}
        />
      </Section>

      <Group justify="space-between" align="flex-end">
        <NumberInput label="Interwał skanowania (min)" value={intervalMinutes} onChange={setInterval} min={1} w={200} />
        <Button onClick={submit} loading={saving} size="md">Zapisz kryteria</Button>
      </Group>
    </Stack>
  );
}
