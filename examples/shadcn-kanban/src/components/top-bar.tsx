import { Add01Icon, Search01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSwarmStats } from "react-cursor-swarm";

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SHOWN = 4;

/** The swarm's cursors show up as live collaborators, straight from useSwarmStats(). */
const Presence = () => {
  const { team } = useSwarmStats();
  if (!team.length) {
    return null;
  }
  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
        {team.length} live
      </span>
      <AvatarGroup>
        {team.slice(0, SHOWN).map((m) => (
          <Tooltip key={m.name}>
            <TooltipTrigger asChild>
              <Avatar size="sm">
                <AvatarFallback className="font-medium text-white" style={{ background: m.color }}>
                  {m.name[0]}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{m.name} is building</TooltipContent>
          </Tooltip>
        ))}
        {team.length > SHOWN && <AvatarGroupCount className="text-xs">+{team.length - SHOWN}</AvatarGroupCount>}
      </AvatarGroup>
    </div>
  );
};

export const TopBar = ({ onNewIssue }: { onNewIssue: () => void }) => (
  <header className="bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
    <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-6">
      <div className="flex items-center gap-2 font-semibold">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
        </span>
        Orbit
      </div>
      <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-center" />
      <nav className="hidden gap-1 text-sm sm:flex">
        <Button variant="secondary" size="sm">
          Issues
        </Button>
        <Button variant="ghost" size="sm">
          Cycles
        </Button>
        <Button variant="ghost" size="sm">
          Roadmap
        </Button>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Presence />
        <div className="relative hidden lg:block">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input placeholder="Search issues" className="w-52 pl-9" />
        </div>
        <Button onClick={onNewIssue}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
          New issue
        </Button>
      </div>
    </div>
  </header>
);
