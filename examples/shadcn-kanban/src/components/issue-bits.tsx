import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PEOPLE, PRIORITIES } from "@/data";
import type { Priority } from "@/data";
import { cn } from "@/lib/utils";

export const Assignee = ({ id, size = "sm" }: { id: string; size?: "sm" | "default" }) => {
  const person = PEOPLE[id];
  return (
    <Avatar size={size} title={person?.name}>
      <AvatarFallback className={cn("font-medium", person?.tint)}>{id}</AvatarFallback>
    </Avatar>
  );
};

export const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const p = PRIORITIES[priority];
  return (
    <Badge variant="outline">
      <HugeiconsIcon icon={p.icon} strokeWidth={2} className={p.tone} data-icon="inline-start" />
      {p.label}
    </Badge>
  );
};
