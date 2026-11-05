import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { KPIS } from "@/data";

// Four cards from one .map(): the swarm builds the first, then ⌥-drags the other three out of it.
export const SectionCards = () => (
  <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
    {KPIS.map((kpi) => {
      const Trend = kpi.up ? TrendingUp : TrendingDown;
      return (
        <Card key={kpi.label} className="from-primary/5 to-card @container/card bg-linear-to-t">
          <CardHeader>
            <CardDescription>{kpi.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{kpi.value}</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <Trend />
                {kpi.delta}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              {kpi.note} <Trend className="size-4" />
            </div>
            <div className="text-muted-foreground">{kpi.sub}</div>
          </CardFooter>
        </Card>
      );
    })}
  </div>
);
