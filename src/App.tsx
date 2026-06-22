import { DashboardScreen } from "./components/DashboardScreen";
import { getCurrentDemoMode } from "./demo/mode";
import { useDemoDashboard } from "./demo/useDemoDashboard";
import { useDashboard } from "./hooks/useDashboard";

function LiveApp() {
  const dashboard = useDashboard();
  return <DashboardScreen {...dashboard} />;
}

function DemoApp() {
  const dashboard = useDemoDashboard();
  return <DashboardScreen {...dashboard} demoMode />;
}

export function App() {
  return getCurrentDemoMode() ? <DemoApp /> : <LiveApp />;
}
