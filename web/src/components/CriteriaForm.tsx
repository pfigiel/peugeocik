import { useState } from "react";
import {
  Button,
  Fieldset,
  Group,
  MultiSelect,
  NumberInput,
  SimpleGrid,
  Switch,
  TextInput,
  Stack,
} from "@mantine/core";
import type { Config, Criteria, Meta } from "../types";

interface Props {
  config: Config;
  meta: Meta;
  saving: boolean;
  onSave: (config: Config) => void;
}

/** NumberInput emits number | string; normalize empty to undefined. */
function num(v: number | string): number | undefined {
  return v === "" || v === undefined ? undefined : Number(v);
}

export function CriteriaForm({ config, meta, saving, onSave }: Props) {
  const search = config.searches[0];
  const [intervalMinutes, setInterval] = useState<number | string>(config.intervalMinutes);
  const [c, setC] = useState<Criteria>(search.criteria);
  const [city, setCity] = useState(search.criteria.location?.city ?? "");
  const [radius, setRadius] = useState<number | string>(search.criteria.location?.radiusKm ?? "");

  const set = <K extends keyof Criteria>(key: K, value: Criteria[K]) =>
    setC((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    const location =
      city.trim() && radius !== "" ? { city: city.trim(), radiusKm: Number(radius) } : undefined;
    const criteria: Criteria = { ...c, location };
    onSave({
      ...config,
      intervalMinutes: Number(intervalMinutes) || config.intervalMinutes,
      searches: [{ ...search, criteria }],
    });
  };

  return (
    <Stack>
      <Fieldset legend="Vehicle">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <TextInput label="Make" placeholder="any" value={c.make ?? ""} onChange={(e) => set("make", e.currentTarget.value || undefined)} />
          <TextInput label="Model" placeholder="any" value={c.model ?? ""} onChange={(e) => set("model", e.currentTarget.value || undefined)} />
          <MultiSelect label="Fuel" data={[...meta.fuelTypes]} value={c.fuelTypes ?? []} onChange={(v) => set("fuelTypes", v.length ? v : undefined)} clearable />
          <MultiSelect label="Gearbox" data={[...meta.gearbox]} value={c.gearbox ?? []} onChange={(v) => set("gearbox", v.length ? v : undefined)} clearable />
          <MultiSelect label="Body type" data={[...meta.bodyTypes]} value={c.bodyTypes ?? []} onChange={(v) => set("bodyTypes", v.length ? v : undefined)} clearable />
        </SimpleGrid>
      </Fieldset>

      <Fieldset legend="Ranges">
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
          <NumberInput label="Price min (PLN)" value={c.priceMin ?? ""} onChange={(v) => set("priceMin", num(v))} thousandSeparator=" " min={0} />
          <NumberInput label="Price max (PLN)" value={c.priceMax ?? ""} onChange={(v) => set("priceMax", num(v))} thousandSeparator=" " min={0} />
          <NumberInput label="Year min" value={c.yearMin ?? ""} onChange={(v) => set("yearMin", num(v))} min={1950} max={2030} />
          <NumberInput label="Year max" value={c.yearMax ?? ""} onChange={(v) => set("yearMax", num(v))} min={1950} max={2030} />
          <NumberInput label="Mileage max (km)" value={c.mileageMax ?? ""} onChange={(v) => set("mileageMax", num(v))} thousandSeparator=" " min={0} />
          <NumberInput label="Engine min (cm³)" value={c.engineCapacityMin ?? ""} onChange={(v) => set("engineCapacityMin", num(v))} min={0} />
          <NumberInput label="Power min (KM)" value={c.enginePowerMin ?? ""} onChange={(v) => set("enginePowerMin", num(v))} min={0} />
        </SimpleGrid>
      </Fieldset>

      <Fieldset legend="Condition & location">
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} verticalSpacing="md">
          <TextInput label="Near city" placeholder="e.g. Gliwice" value={city} onChange={(e) => setCity(e.currentTarget.value)} />
          <NumberInput label="Radius (km)" value={radius} onChange={setRadius} min={0} />
          <Switch label="Non-damaged only" mt="xl" checked={!!c.excludeDamaged} onChange={(e) => set("excludeDamaged", e.currentTarget.checked || undefined)} />
          <Switch label="Registered in PL" mt="xl" checked={!!c.registeredInPL} onChange={(e) => set("registeredInPL", e.currentTarget.checked || undefined)} />
        </SimpleGrid>
      </Fieldset>

      <Group justify="space-between">
        <NumberInput label="Scan interval (min)" value={intervalMinutes} onChange={setInterval} min={1} w={180} />
        <Button onClick={submit} loading={saving} mt="xl">
          Save criteria
        </Button>
      </Group>
    </Stack>
  );
}
