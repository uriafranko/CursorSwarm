import { CircleCheck, CircleX, Ellipsis, GitBranch, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEPLOYMENTS } from "@/data";
import type { DeployStatus } from "@/data";

const STATUS: Record<DeployStatus, { icon: typeof CircleCheck; className: string }> = {
  Building: { className: "text-amber-600 dark:text-amber-400 animate-spin", icon: LoaderCircle },
  Failed: { className: "text-destructive", icon: CircleX },
  Ready: { className: "text-emerald-600 dark:text-emerald-400", icon: CircleCheck },
};

/** Header checkbox: checked when every row is selected, indeterminate when only some are. */
const selectAllState = (selected: number, total: number): boolean | "indeterminate" => {
  if (selected === total) {
    return true;
  }
  return selected > 0 ? "indeterminate" : false;
};

export const DeploymentsTable = () => {
  // Plain React state: selection keeps working during and after the build.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  const all = selected.size === DEPLOYMENTS.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployments</CardTitle>
        <CardDescription>
          {selected.size ? `${selected.size} selected` : "Every deploy across your projects in the last 24 hours."}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  aria-label="Select all"
                  checked={selectAllState(selected.size, DEPLOYMENTS.length)}
                  onCheckedChange={() => setSelected(all ? new Set() : new Set(DEPLOYMENTS.map((d) => d.id)))}
                />
              </TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Branch</TableHead>
              <TableHead className="hidden sm:table-cell">Duration</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-right">Age</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEPLOYMENTS.map((d) => {
              const s = STATUS[d.status];
              return (
                <TableRow key={d.id} data-state={selected.has(d.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${d.id}`}
                      checked={selected.has(d.id)}
                      onCheckedChange={() => toggle(d.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{d.service}</div>
                    <div className="text-muted-foreground font-mono text-xs">{d.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-muted-foreground gap-1 px-1.5">
                      <s.icon className={s.className} />
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                      <GitBranch className="text-muted-foreground size-3.5" />
                      {d.branch}
                    </span>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{d.duration}</TableCell>
                  <TableCell>
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">{d.author}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">{d.age} ago</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Open menu">
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Inspect</DropdownMenuItem>
                        <DropdownMenuItem>Redeploy</DropdownMenuItem>
                        <DropdownMenuItem>Copy URL</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Roll back</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
