import { Add01Icon, Calendar03Icon, Comment01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Swarm } from "react-cursor-swarm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { COLUMNS } from "@/data";
import type { Issue, Status } from "@/data";

import { Assignee, PriorityBadge } from "./issue-bits";

const IssueCard = ({ issue, onOpen }: { issue: Issue; onOpen: (issue: Issue) => void }) => (
  <Card
    size="sm"
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the whole card is the target; a <button> can't hold its block content
    role="button"
    tabIndex={0}
    onClick={() => onOpen(issue)}
    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(issue)}
    className="hover:ring-foreground/20 focus-visible:ring-ring cursor-pointer transition-shadow outline-none focus-visible:ring-2"
  >
    <CardHeader>
      <span className="text-muted-foreground font-mono text-xs">{issue.id}</span>
      <CardTitle className="leading-snug">{issue.title}</CardTitle>
      <CardAction>
        <Assignee id={issue.assignee} />
      </CardAction>
    </CardHeader>
    <CardContent className="flex flex-wrap gap-1.5">
      <PriorityBadge priority={issue.priority} />
      {issue.labels.map((label) => (
        <Badge key={label} variant="secondary">
          {label}
        </Badge>
      ))}
    </CardContent>
    <CardFooter className="text-muted-foreground gap-3 text-xs">
      <span className="flex items-center gap-1">
        <HugeiconsIcon icon={Comment01Icon} strokeWidth={2} className="size-3.5" />
        {issue.comments}
      </span>
      {issue.due && (
        <span className="flex items-center gap-1">
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-3.5" />
          {issue.due}
        </span>
      )}
    </CardFooter>
  </Card>
);

export const Board = ({
  issues,
  onOpen,
  onAdd,
}: {
  issues: Issue[];
  onOpen: (issue: Issue) => void;
  onAdd: (status: Status) => void;
}) => (
  <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-4">
    {COLUMNS.map((col) => {
      const items = issues.filter((i) => i.status === col.id);
      return (
        <section key={col.id} className="bg-muted/60 flex w-76 shrink-0 flex-col gap-3 rounded-3xl p-3">
          <header className="flex items-center gap-2 px-1.5 pt-0.5">
            <HugeiconsIcon icon={col.icon} strokeWidth={2} className={`size-4 ${col.tone}`} />
            <h3 className="text-sm font-medium">{col.title}</h3>
            <Badge variant="secondary" className="tabular-nums">
              {items.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-auto"
              aria-label={`New issue in ${col.title}`}
              onClick={() => onAdd(col.id)}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            </Button>
          </header>
          {items.map((issue) =>
            // Cards that existed on load are built with the board (and ⌥-dragged from the
            // first card in their column). A card you create gets its own <Swarm>, so the
            // cursors come back and build just that card.
            issue.fresh ? (
              <Swarm key={issue.id} trigger="mount">
                <IssueCard issue={issue} onOpen={onOpen} />
              </Swarm>
            ) : (
              <IssueCard key={issue.id} issue={issue} onOpen={onOpen} />
            )
          )}
        </section>
      );
    })}
  </div>
);
