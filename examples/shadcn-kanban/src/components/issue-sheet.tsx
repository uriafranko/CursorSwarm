import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Swarm } from "react-cursor-swarm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { COLUMNS, PEOPLE } from "@/data";
import type { Issue } from "@/data";

import { Assignee, PriorityBadge } from "./issue-bits";

const ACTIVITY = [
  { text: "moved this from Backlog to Todo", when: "2d ago", who: "JL" },
  { text: "Looks good, can we ship it behind a flag first?", when: "1d ago", who: "RN" },
  { text: "Yes, flag is `new-nav`. Rolling out to staff today.", when: "3h ago", who: "AM" },
];

export const IssueSheet = ({
  issue,
  onClose,
  onComplete,
}: {
  issue: Issue | null;
  onClose: () => void;
  onComplete: (issue: Issue) => void;
}) => {
  // Keep showing the last issue while the sheet animates closed.
  const [last, setLast] = useState(issue);
  if (issue && issue !== last) {
    setLast(issue);
  }
  const shown = issue ?? last;

  return (
    <Sheet open={!!issue} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        {/* Same idea as the dialog: the sheet lives in a portal, so the <Swarm> goes inside it. */}
        {shown && (
          <Swarm key={shown.id} trigger="mount">
            <SheetHeader>
              <span className="text-muted-foreground font-mono text-xs">{shown.id}</span>
              <SheetTitle className="text-lg leading-snug">{shown.title}</SheetTitle>
              <SheetDescription>{shown.description}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6">
              <dl className="grid grid-cols-[7rem_1fr] items-center gap-y-3 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{COLUMNS.find((c) => c.id === shown.status)?.title}</dd>
                <dt className="text-muted-foreground">Priority</dt>
                <dd>
                  <PriorityBadge priority={shown.priority} />
                </dd>
                <dt className="text-muted-foreground">Assignee</dt>
                <dd className="flex items-center gap-2">
                  <Assignee id={shown.assignee} />
                  {PEOPLE[shown.assignee]?.name}
                </dd>
                <dt className="text-muted-foreground">Labels</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {shown.labels.length ? (
                    shown.labels.map((l) => (
                      <Badge key={l} variant="secondary">
                        {l}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </dd>
                {shown.due && (
                  <>
                    <dt className="text-muted-foreground">Due</dt>
                    <dd>{shown.due}</dd>
                  </>
                )}
              </dl>

              <Separator />

              <section className="flex flex-col gap-4">
                <h4 className="text-sm font-medium">Activity</h4>
                {ACTIVITY.map((a) => (
                  <div key={a.text} className="flex gap-3 text-sm">
                    <Assignee id={a.who} />
                    <div className="flex flex-col gap-0.5">
                      <span>
                        <span className="font-medium">{PEOPLE[a.who].name}</span>{" "}
                        <span className="text-muted-foreground">{a.when}</span>
                      </span>
                      <span className="text-muted-foreground">{a.text}</span>
                    </div>
                  </div>
                ))}
              </section>
            </div>

            <SheetFooter>
              {shown.status !== "done" && (
                <Button onClick={() => onComplete(shown)}>
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} data-icon="inline-start" />
                  Mark as done
                </Button>
              )}
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
            </SheetFooter>
          </Swarm>
        )}
      </SheetContent>
    </Sheet>
  );
};
