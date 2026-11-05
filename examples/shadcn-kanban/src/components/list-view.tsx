import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { COLUMNS, PRIORITIES } from "@/data";
import type { Issue } from "@/data";

import { Assignee } from "./issue-bits";

export const ListView = ({ issues, onOpen }: { issues: Issue[]; onOpen: (issue: Issue) => void }) => (
  <Card className="gap-0 py-0">
    {COLUMNS.map((col) => {
      const items = issues.filter((i) => i.status === col.id);
      if (!items.length) {
        return null;
      }
      return (
        <section key={col.id}>
          <h3 className="bg-muted/50 flex items-center gap-2 border-b px-4 py-2 text-sm font-medium">
            <HugeiconsIcon icon={col.icon} strokeWidth={2} className={`size-4 ${col.tone}`} />
            {col.title}
            <span className="text-muted-foreground tabular-nums">{items.length}</span>
          </h3>
          {items.map((issue) => {
            const p = PRIORITIES[issue.priority];
            return (
              <button
                key={issue.id}
                type="button"
                onClick={() => onOpen(issue)}
                className="hover:bg-muted/50 flex w-full items-center gap-3 border-b px-4 py-2.5 text-left text-sm transition-colors last:border-b-0"
              >
                <HugeiconsIcon icon={p.icon} strokeWidth={2} className={`size-4 shrink-0 ${p.tone}`} />
                <span className="text-muted-foreground w-16 shrink-0 font-mono text-xs">{issue.id}</span>
                <span className="min-w-0 flex-1 truncate">{issue.title}</span>
                <span className="hidden gap-1.5 md:flex">
                  {issue.labels.map((l) => (
                    <Badge key={l} variant="secondary">
                      {l}
                    </Badge>
                  ))}
                </span>
                <span className="text-muted-foreground hidden w-14 text-right text-xs sm:block">{issue.due}</span>
                <Assignee id={issue.assignee} />
              </button>
            );
          })}
        </section>
      );
    })}
  </Card>
);
