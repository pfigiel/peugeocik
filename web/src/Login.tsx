import { useState } from "react";
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { supabase } from "./supabase";

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
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <Center mih="100dvh" p="md">
      <Paper withBorder radius="lg" p="xl" w="100%" maw={380} component="form" onSubmit={submit} shadow="md">
        <Stack gap="lg">
          <Stack gap={4} align="center">
            <Text fz={44} lh={1}>🚗</Text>
            <Title order={3}>peugeocik</Title>
            <Text c="dimmed" size="sm">Sign in to view car offers</Text>
          </Stack>
          {error && <Alert color="red" variant="light">{error}</Alert>}
          <TextInput label="Email" type="email" required size="md" value={email}
            onChange={(e) => setEmail(e.currentTarget.value)} autoComplete="username" />
          <PasswordInput label="Password" required size="md" value={password}
            onChange={(e) => setPassword(e.currentTarget.value)} autoComplete="current-password" />
          <Button type="submit" loading={loading} fullWidth size="md" mt="xs">Sign in</Button>
        </Stack>
      </Paper>
    </Center>
  );
}
