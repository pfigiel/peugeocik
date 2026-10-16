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
    // On success, onAuthStateChange in Root swaps to the app.
  };

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder radius="md" p="xl" w={360} component="form" onSubmit={submit}>
        <Stack>
          <div>
            <Title order={3}>🚗 peugeocik</Title>
            <Text c="dimmed" size="sm">Sign in to view car offers</Text>
          </div>
          {error && <Alert color="red">{error}</Alert>}
          <TextInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.currentTarget.value)} autoComplete="username" />
          <PasswordInput label="Password" required value={password} onChange={(e) => setPassword(e.currentTarget.value)} autoComplete="current-password" />
          <Button type="submit" loading={loading} fullWidth>Sign in</Button>
        </Stack>
      </Paper>
    </Center>
  );
}
