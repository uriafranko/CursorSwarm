import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Swarm } from "react-cursor-swarm";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COLUMNS, PEOPLE, PRIORITIES } from "@/data";
import type { Issue, Priority, Status } from "@/data";

export type NewIssue = Pick<Issue, "title" | "description" | "status" | "priority" | "assignee">;

const IssueForm = ({ status, onCreate }: { status: Status; onCreate: (issue: NewIssue) => void }) => {
  const title = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<NewIssue>({
    assignee: "AM",
    description: "",
    priority: "medium",
    status,
    title: "",
  });
  const set = <K extends keyof NewIssue>(key: K, value: NewIssue[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      return title.current?.focus();
    }
    onCreate({ ...draft, title: draft.title.trim() });
  };

  return (
    // Inputs are hidden while the cursors draw them, so focus the title once the build is done.
    <Swarm trigger="mount" onBuildComplete={() => title.current?.focus()}>
      <DialogHeader>
        <DialogTitle>New issue</DialogTitle>
        <DialogDescription>It lands on the board and the swarm builds the card for you.</DialogDescription>
      </DialogHeader>
      <form id="new-issue" onSubmit={submit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="issue-title">Title</FieldLabel>
            <Input
              ref={title}
              id="issue-title"
              placeholder="Fix the flaky checkout test"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="issue-description">Description</FieldLabel>
            <Textarea
              id="issue-description"
              placeholder="Add some context…"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select value={draft.status} onValueChange={(v) => set("status", v as Status)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select value={draft.priority} onValueChange={(v) => set("priority", v as Priority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITIES).map(([id, p]) => (
                    <SelectItem key={id} value={id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Assignee</FieldLabel>
              <Select value={draft.assignee} onValueChange={(v) => set("assignee", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PEOPLE).map(([id, p]) => (
                    <SelectItem key={id} value={id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FieldGroup>
      </form>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" form="new-issue">
          Create issue
        </Button>
      </DialogFooter>
    </Swarm>
  );
};

export const NewIssueDialog = ({
  open,
  onOpenChange,
  status,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: Status;
  onCreate: (issue: NewIssue) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      {/*
          shadcn renders dialogs in a portal, so the <Swarm> goes *inside* DialogContent.
          Radix mounts the content each time the dialog opens, so the form is built fresh every time.
        */}
      <IssueForm status={status} onCreate={onCreate} />
    </DialogContent>
  </Dialog>
);
