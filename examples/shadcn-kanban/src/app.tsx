import { RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";
import { Swarm, SwarmProvider } from "react-cursor-swarm";
import type { SwarmHandle } from "react-cursor-swarm";
import { toast } from "sonner";

import { Board } from "@/components/board";
import { IssueSheet } from "@/components/issue-sheet";
import { ListView } from "@/components/list-view";
import { NewIssueDialog } from "@/components/new-issue-dialog";
import type { NewIssue } from "@/components/new-issue-dialog";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ISSUES } from "@/data";
import type { Issue, Status } from "@/data";

export const App = () => {
  const [issues, setIssues] = useState<Issue[]>(ISSUES);
  const [view, setView] = useState("board");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newIn, setNewIn] = useState<Status | null>(null);
  const nextId = useRef(150);
  // Points at whichever view is mounted, so one button can rebuild it.
  const viewRef = useRef<SwarmHandle>(null);

  const openIssue = issues.find((i) => i.id === openId) ?? null;
  const done = issues.filter((i) => i.status === "done").length;

  const create = (draft: NewIssue) => {
    const id = `ORB-${(nextId.current += 1)}`;
    setIssues((list) => [...list, { ...draft, comments: 0, fresh: true, id, labels: ["New"] }]);
    setNewIn(null);
    toast.success(`${id} created`, { description: draft.title });
  };

  const complete = (issue: Issue) => {
    setIssues((list) => list.map((i) => (i.id === issue.id ? { ...i, status: "done" } : i)));
    toast(`${issue.id} marked as done`);
  };

  return (
    <SwarmProvider agents={8} speed={2} finale="flock">
      <TooltipProvider>
        <div className="bg-background min-h-svh">
          <Swarm trigger="mount">
            <TopBar onNewIssue={() => setNewIn("todo")} />
          </Swarm>

          <Tabs value={view} onValueChange={setView} className="mx-auto max-w-7xl gap-6 px-6 py-8">
            <Swarm trigger="mount" delay={200}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-sm">Website relaunch · Cycle 12</span>
                  <h1 className="text-2xl font-semibold tracking-tight">Ship the new marketing site</h1>
                  <div className="text-muted-foreground mt-2 flex items-center gap-3 text-sm">
                    <Progress value={(done / issues.length) * 100} className="w-40" />
                    <span className="tabular-nums">
                      {done} of {issues.length} done
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TabsList>
                    <TabsTrigger value="board">Board</TabsTrigger>
                    <TabsTrigger value="list">List</TabsTrigger>
                  </TabsList>
                  <Button variant="outline" onClick={() => viewRef.current?.replay()}>
                    <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon="inline-start" />
                    Rebuild
                  </Button>
                </div>
              </div>
            </Swarm>

            {/* Radix mounts a tab's content when you switch to it, so each view is rebuilt on every switch. */}
            <TabsContent value="board">
              <Swarm ref={viewRef} trigger="mount" delay={300}>
                <Board issues={issues} onOpen={(i) => setOpenId(i.id)} onAdd={setNewIn} />
              </Swarm>
            </TabsContent>
            <TabsContent value="list">
              {/* detail="boxes": no typing, so a dense list comes together quickly. */}
              <Swarm ref={viewRef} trigger="mount" detail="boxes">
                <ListView issues={issues} onOpen={(i) => setOpenId(i.id)} />
              </Swarm>
            </TabsContent>
          </Tabs>
        </div>

        <NewIssueDialog
          open={newIn !== null}
          onOpenChange={(open) => !open && setNewIn(null)}
          status={newIn ?? "todo"}
          onCreate={create}
        />
        <IssueSheet issue={openIssue} onClose={() => setOpenId(null)} onComplete={complete} />
        <Toaster position="bottom-left" />
      </TooltipProvider>
    </SwarmProvider>
  );
};
