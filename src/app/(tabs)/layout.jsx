import AppShell from "@/components/AppShell";
import BottomNav from "@/components/BottomNav";

export default function TabsLayout({ children }) {
  return (
    <AppShell>
      {children}
      <BottomNav />
    </AppShell>
  );
}
