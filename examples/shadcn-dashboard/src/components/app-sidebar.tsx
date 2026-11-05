import {
  ChartArea,
  ChevronsUpDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Rocket,
  Send,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import type { ComponentProps } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV = [
  { active: true, icon: LayoutDashboard, title: "Overview" },
  { icon: ChartArea, title: "Analytics" },
  { badge: "6", icon: Rocket, title: "Deployments" },
  { icon: Users, title: "Customers" },
  { icon: FileText, title: "Reports" },
];

const PROJECTS = [
  { color: "bg-sky-500", name: "Marketing site" },
  { color: "bg-violet-500", name: "Checkout" },
  { color: "bg-emerald-500", name: "Mobile app" },
];

const SECONDARY = [
  { icon: CreditCard, title: "Billing" },
  { icon: Settings2, title: "Settings" },
  { icon: LifeBuoy, title: "Support" },
  { icon: Send, title: "Feedback" },
];

export const AppSidebar = (props: ComponentProps<typeof Sidebar>) => (
  <Sidebar collapsible="icon" {...props}>
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Lumen</span>
              <span className="text-muted-foreground truncate text-xs">Pro workspace</span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {NAV.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton isActive={item.active} tooltip={item.title}>
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
                {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {PROJECTS.map((p) => (
              <SidebarMenuItem key={p.name}>
                <SidebarMenuButton tooltip={p.name}>
                  <span className={`size-2 shrink-0 rounded-full ${p.color}`} />
                  <span>{p.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="mt-auto">
        <SidebarGroupContent>
          <SidebarMenu>
            {SECONDARY.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton size="sm" tooltip={item.title}>
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">AM</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Ada Moreno</span>
              <span className="text-muted-foreground truncate text-xs">ada@lumen.dev</span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
);
