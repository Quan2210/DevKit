import { Outlet } from "react-router";
import { AppShell } from "./AppShell";

/** Layout route: every page lives inside the shell. */
export default function AppShellRoute() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
