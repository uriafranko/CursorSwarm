import {
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  Clock01Icon,
  DashedLineCircleIcon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";

export type Status = "backlog" | "todo" | "in-progress" | "done";
export type Priority = "urgent" | "high" | "medium" | "low";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  labels: string[];
  assignee: string;
  comments: number;
  due?: string;
  /** Created in this session: the swarm builds it when it lands on the board. */
  fresh?: boolean;
}

export const COLUMNS: { id: Status; title: string; icon: typeof CircleIcon; tone: string }[] = [
  { icon: DashedLineCircleIcon, id: "backlog", title: "Backlog", tone: "text-muted-foreground" },
  { icon: CircleIcon, id: "todo", title: "Todo", tone: "text-foreground" },
  { icon: Clock01Icon, id: "in-progress", title: "In progress", tone: "text-amber-500" },
  { icon: CheckmarkCircle02Icon, id: "done", title: "Done", tone: "text-emerald-500" },
];

export const PRIORITIES: Record<Priority, { label: string; icon: typeof CircleIcon; tone: string }> = {
  high: { icon: ArrowUp01Icon, label: "High", tone: "text-orange-500" },
  low: { icon: ArrowDown01Icon, label: "Low", tone: "text-muted-foreground" },
  medium: { icon: MinusSignIcon, label: "Medium", tone: "text-yellow-500" },
  urgent: { icon: AlertCircleIcon, label: "Urgent", tone: "text-red-500" },
};

export const PEOPLE: Record<string, { name: string; tint: string }> = {
  AM: { name: "Ada Moreno", tint: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  JL: { name: "Jun Lee", tint: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  RN: { name: "Rosa Nunez", tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  TK: { name: "Theo Kim", tint: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
};

export const ISSUES: Issue[] = [
  {
    assignee: "RN",
    comments: 2,
    description: "Run the new pages through an a11y checker and fix anything below 4.5:1.",
    id: "ORB-141",
    labels: ["Design", "a11y"],
    priority: "medium",
    status: "backlog",
    title: "Audit color contrast on marketing pages",
  },
  {
    assignee: "TK",
    comments: 0,
    description: "Something that hints at collaboration without a stock photo of people high-fiving.",
    id: "ORB-138",
    labels: ["Design"],
    priority: "low",
    status: "backlog",
    title: "Explore an animated hero illustration",
  },
  {
    assignee: "JL",
    comments: 5,
    description: "The old CMS export is read-only after January. Migrate posts and redirects.",
    due: "Nov 18",
    id: "ORB-136",
    labels: ["Backend"],
    priority: "high",
    status: "todo",
    title: "Move blog to the new content API",
  },
  {
    assignee: "AM",
    comments: 3,
    description: "Add the toggle, persist the choice in the URL and show the yearly discount.",
    due: "Nov 21",
    id: "ORB-133",
    labels: ["Frontend", "Growth"],
    priority: "medium",
    status: "todo",
    title: "Pricing page: annual / monthly toggle",
  },
  {
    assignee: "JL",
    comments: 8,
    description: "Campaign attribution is missing for about 30% of new trials since the redesign.",
    due: "Nov 7",
    id: "ORB-131",
    labels: ["Bug", "Growth"],
    priority: "urgent",
    status: "todo",
    title: "Sign-up form drops UTM params",
  },
  {
    assignee: "AM",
    comments: 12,
    description: "Build the mega-menu from the Figma spec, keyboard accessible, with a mobile sheet.",
    due: "Nov 12",
    id: "ORB-127",
    labels: ["Frontend"],
    priority: "high",
    status: "in-progress",
    title: "New navigation with product mega-menu",
  },
  {
    assignee: "TK",
    comments: 1,
    description: "Grayscale logos, hover to color, link to case studies where we have them.",
    id: "ORB-124",
    labels: ["Frontend", "Design"],
    priority: "low",
    status: "in-progress",
    title: "Customer logos wall",
  },
  {
    assignee: "RN",
    comments: 4,
    description: "Each pull request gets its own URL, posted as a comment by the bot.",
    id: "ORB-119",
    labels: ["Infra"],
    priority: "medium",
    status: "done",
    title: "Set up preview deploys for every PR",
  },
  {
    assignee: "AM",
    comments: 6,
    description: "Blog post + changelog entry + a short thread. Review with marketing before publishing.",
    id: "ORB-115",
    labels: ["Content"],
    priority: "medium",
    status: "done",
    title: "Write the launch announcement",
  },
];
