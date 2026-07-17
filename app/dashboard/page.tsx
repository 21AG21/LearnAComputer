import { getModuleRoutes } from "@/lib/lessons";
import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  const routes = getModuleRoutes();

  return (
    <div className="h-full overflow-y-auto p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Your progress</h1>
      <DashboardView routes={routes} />
    </div>
  );
}
