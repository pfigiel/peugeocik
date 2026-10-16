import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Center, Loader, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { App } from "./App";
import { Login } from "./Login";

function Root() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <Center mih="100vh"><Loader /></Center>;
  if (!session) return <Login />;
  return <App session={session} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="auto">
      <Root />
    </MantineProvider>
  </React.StrictMode>,
);
