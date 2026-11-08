import type { ReactNode } from "react";
import { AppShell } from "@/screens/app-shell/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
