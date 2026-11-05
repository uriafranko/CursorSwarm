import { useState } from "react";
import { Swarm, SwarmProvider } from "react-cursor-swarm";

import { AppSidebar } from "@/components/app-sidebar";
import { DeploymentsTable } from "@/components/deployments-table";
import { RecentSales } from "@/components/recent-sales";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SwarmControls } from "@/components/swarm-controls";
import type { SwarmSettings } from "@/components/swarm-controls";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VisitorsChart } from "@/components/visitors-chart";

export const App = () => {
  // The provider takes plain props, so a settings panel is just React state.
  const [settings, setSettings] = useState<SwarmSettings>({
    agents: 10,
    detail: "full",
    flock: true,
    labels: true,
    speed: 2,
  });

  return (
    <SwarmProvider
      agents={settings.agents}
      speed={settings.speed}
      detail={settings.detail}
      labels={settings.labels}
      finale={settings.flock ? "flock" : "leave"}
    >
      <TooltipProvider>
        <SidebarProvider>
          {/* <Swarm> renders `display: contents`, so it never breaks the shadcn layout around it. */}
          <Swarm trigger="mount">
            <AppSidebar />
          </Swarm>
          <SidebarInset>
            <Swarm trigger="mount" delay={150}>
              <SiteHeader />
            </Swarm>
            <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
              <Swarm trigger="mount" delay={300}>
                <SectionCards />
              </Swarm>
              <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-7">
                {/* The chart is Recharts SVG: the swarm sweeps it in as one media layer. */}
                <Swarm>
                  <VisitorsChart className="xl:col-span-4" />
                </Swarm>
                <Swarm>
                  <RecentSales className="xl:col-span-3" />
                </Swarm>
              </div>
              {/* Builds when you scroll down to it (trigger="visible" is the default). */}
              <Swarm>
                <DeploymentsTable />
              </Swarm>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <SwarmControls settings={settings} onChange={setSettings} />
      </TooltipProvider>
    </SwarmProvider>
  );
};
