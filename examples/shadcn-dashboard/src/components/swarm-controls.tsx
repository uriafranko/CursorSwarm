import { ChevronDown, Eye, MousePointer2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useSwarmEngine, useSwarmStats } from "react-cursor-swarm";
import type { Detail } from "react-cursor-swarm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface SwarmSettings {
  agents: number;
  speed: number;
  detail: Detail;
  labels: boolean;
  flock: boolean;
}

/**
 * A floating panel that drives the <SwarmProvider> above it. Every provider option can change
 * at any time; changing `detail` rebuilds the page so you can compare the three levels.
 */
const statusLabel = (building: number, flocking: boolean) => {
  if (building) {
    return "Building";
  }
  return flocking ? "Flocking" : "Idle";
};

export const SwarmControls = ({
  settings,
  onChange,
}: {
  settings: SwarmSettings;
  onChange: (next: SwarmSettings) => void;
}) => {
  const engine = useSwarmEngine();
  const { agents, done, total, building, team, flocking } = useSwarmStats();
  const [open, setOpen] = useState(true);
  const set = <K extends keyof SwarmSettings>(key: K, value: SwarmSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const status = statusLabel(building, flocking);

  return (
    <Card size="sm" className="fixed right-4 bottom-4 z-50 w-76 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MousePointer2 className="size-4" /> Swarm
          <Badge variant={status === "Idle" ? "outline" : "secondary"}>{status}</Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <span className="flex -space-x-1">
            {team.map((m) => (
              <span
                key={m.name}
                title={m.name}
                className="ring-card size-3 rounded-full ring-2"
                style={{ background: m.color }}
              />
            ))}
          </span>
          {agents} {agents === 1 ? "cursor" : "cursors"} on screen
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown className={open ? "" : "rotate-180"} />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>Layers built</span>
            <span className="tabular-nums">{total ? `${done} / ${total}` : "all done"}</span>
          </div>
          <Progress value={total ? (done / total) * 100 : 100} />
        </div>

        {open && (
          <>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <Label htmlFor="agents">Cursors</Label>
                <span className="text-muted-foreground text-sm tabular-nums">{settings.agents}</span>
              </div>
              <Slider
                id="agents"
                min={1}
                max={24}
                step={1}
                value={[settings.agents]}
                onValueChange={([v]) => set("agents", v)}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <Label htmlFor="speed">Speed</Label>
                <span className="text-muted-foreground text-sm tabular-nums">{settings.speed}×</span>
              </div>
              <Slider
                id="speed"
                min={0.5}
                max={5}
                step={0.5}
                value={[settings.speed]}
                onValueChange={([v]) => set("speed", v)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span id="swarm-detail-label" className="text-sm leading-none font-medium select-none">
                Detail
              </span>
              <ToggleGroup
                aria-labelledby="swarm-detail-label"
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                className="w-full *:flex-1"
                value={settings.detail}
                onValueChange={(v) => v && set("detail", v as Detail)}
              >
                <ToggleGroupItem value="full">Full</ToggleGroupItem>
                <ToggleGroupItem value="boxes">Boxes</ToggleGroupItem>
                <ToggleGroupItem value="outline">Outline</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="labels">Name tags</Label>
              <Switch id="labels" checked={settings.labels} onCheckedChange={(v) => set("labels", v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="flock">Flock to pointer when done</Label>
              <Switch
                id="flock"
                checked={settings.flock}
                onCheckedChange={(v) => {
                  set("flock", v);
                  // The `finale` option applies after the next build; call the engine to act right now.
                  if (!v) {
                    engine.dismiss();
                  } else if (!building) {
                    engine.flock();
                  }
                }}
              />
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button size="sm" className="flex-1" onClick={() => engine.replayAll()}>
          <RotateCcw /> Replay all
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => engine.revealAll()}>
          <Eye /> Skip to end
        </Button>
      </CardFooter>
    </Card>
  );
};
