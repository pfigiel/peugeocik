import { useState } from "react";
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { supabase } from "./supabase";
import { Logo } from "./components/Logo";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Nieprawidłowy e-mail lub hasło");
    setLoading(false);
  };

  return (
    <Center mih="100dvh" p="md">
      <Paper withBorder radius="lg" p="xl" w="100%" maw={380} component="form" onSubmit={submit} shadow="md"
        style={{ background: "var(--mantine-color-dark-6)", borderColor: "var(--mantine-color-dark-4)" }}>
        <Stack gap="lg">
          <Stack gap="xs" align="center">
            <Logo size={52} />
            <Title order={3}>peugeocik</Title>
            <Text c="dimmed" size="sm">Zaloguj się, aby zobaczyć oferty</Text>
          </Stack>
          {error && <Alert color="red" variant="light">{error}</Alert>}
          <TextInput label="E-mail" type="email" required size="md" value={email}
            onChange={(e) => setEmail(e.currentTarget.value)} autoComplete="username" />
          <PasswordInput label="Hasło" required size="md" value={password}
            onChange={(e) => setPassword(e.currentTarget.value)} autoComplete="current-password" />
          <Button type="submit" loading={loading} fullWidth size="md" mt="xs">Zaloguj</Button>
        </Stack>
      </Paper>
    </Center>
  );
}
