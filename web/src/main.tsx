import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Center, createTheme, Input, Loader, MantineColorsTuple, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { App } from "./App";
import { Login } from "./Login";

const amber: MantineColorsTuple = [
  "#fff8e8", "#ffefcb", "#ffdd9a", "#ffca64", "#ffba38", "#ffb01c",
  "#ffab09", "#e39500", "#ca8400", "#af7100",
];

const dark: MantineColorsTuple = [
  "#c9c9ca", "#b8b8b9", "#8d8d8f", "#5c5c5f", "#26272b",
  "#1b1c20", "#141518", "#0a0a0c", "#070709", "#050506",
];

const theme = createTheme({
  primaryColor: "amber",
  primaryShade: 5,
  autoContrast: true,
  luminanceThreshold: 0.35,
  defaultRadius: "md",
  colors: { amber, dark },
  fontFamilyMonospace: 'ui-monospace, "SFMono-Regular", "DM Mono", Menlo, Consolas, monospace',
  components: {
    Input: Input.extend({
      styles: { input: { backgroundColor: "var(--mantine-color-dark-7)" } },
    }),
  },
});

function Root() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    // A 401 from the backend (expired session) clears auth in api.ts and fires
    // this; drop to the login screen without waiting on supabase's own event.
    const onSignout = () => setSession(null);
    window.addEventListener("peugeocik:signout", onSignout);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("peugeocik:signout", onSignout);
    };
  }, []);

  if (!ready) return <Center mih="100dvh"><Loader /></Center>;
  if (!session) return <Login />;
  return <App session={session} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} forceColorScheme="dark">
      <Root />
    </MantineProvider>
  </React.StrictMode>,
);
