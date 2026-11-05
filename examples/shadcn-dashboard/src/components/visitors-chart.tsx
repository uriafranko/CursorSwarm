import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VISITORS } from "@/data";

const config = {
  desktop: { color: "var(--chart-1)", label: "Desktop" },
  mobile: { color: "var(--chart-2)", label: "Mobile" },
  visitors: { label: "Visitors" },
} satisfies ChartConfig;

const RANGES = { "30d": 30, "7d": 7, "90d": 90 } as const;
type Range = keyof typeof RANGES;

const day = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });

export const VisitorsChart = ({ className }: { className?: string }) => {
  const [range, setRange] = useState<Range>("90d");
  const data = VISITORS.slice(-RANGES[range]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Total visitors</CardTitle>
        <CardDescription>Desktop and mobile, last {RANGES[range]} days</CardDescription>
        <CardAction>
          {/* Still a live control once the swarm is done: switch the range. */}
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
          >
            <ToggleGroupItem value="90d">90 days</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={day}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(label) => day(String(label))} indicator="dot" />}
            />
            <Area dataKey="mobile" type="natural" fill="url(#fillMobile)" stroke="var(--color-mobile)" stackId="a" />
            <Area dataKey="desktop" type="natural" fill="url(#fillDesktop)" stroke="var(--color-desktop)" stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
