import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVITY } from "@/data";

export const RecentSales = ({ className }: { className?: string }) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle>Recent sales</CardTitle>
      <CardDescription>265 sales this month</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-5">
      {ACTIVITY.map((a) => (
        <div key={a.email} className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{a.initials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="truncate text-sm leading-none font-medium">{a.name}</p>
            <p className="text-muted-foreground truncate text-sm">{a.email}</p>
          </div>
          <div className="font-medium tabular-nums">{a.amount}</div>
        </div>
      ))}
    </CardContent>
  </Card>
);
