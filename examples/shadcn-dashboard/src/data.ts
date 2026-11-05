// Demo data. Deterministic so every build of the page looks the same.

export const KPIS = [
  {
    delta: "+12.5%",
    label: "Revenue",
    note: "Trending up this month",
    sub: "Compared to the last 30 days",
    up: true,
    value: "$48,294",
  },
  {
    delta: "-4.1%",
    label: "New customers",
    note: "Down 4% this period",
    sub: "Acquisition needs attention",
    up: false,
    value: "1,284",
  },
  {
    delta: "+8.2%",
    label: "Active accounts",
    note: "Strong user retention",
    sub: "Engagement exceeds targets",
    up: true,
    value: "45,678",
  },
  {
    delta: "+1.3%",
    label: "Growth rate",
    note: "Steady performance",
    sub: "Meets growth projections",
    up: true,
    value: "6.4%",
  },
];

/** 90 days of visitors, split by desktop / mobile. */
export const VISITORS = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 7, 7 + i));
  const wave = Math.sin(i / 6) * 60 + Math.sin(i / 2.3) * 25;
  const trend = i * 2.2;
  return {
    date: date.toISOString().slice(0, 10),
    desktop: Math.round(220 + trend + wave + (i % 7 === 5 ? 70 : 0)),
    mobile: Math.round(140 + trend * 0.8 + Math.cos(i / 5) * 45 + (i % 9 === 3 ? 50 : 0)),
  };
});

export const ACTIVITY = [
  { amount: "+$1,999.00", email: "olivia@northwind.dev", initials: "OM", name: "Olivia Martin" },
  { amount: "+$39.00", email: "jackson@lee.studio", initials: "JL", name: "Jackson Lee" },
  { amount: "+$299.00", email: "isabella@nguyen.io", initials: "IN", name: "Isabella Nguyen" },
  { amount: "+$99.00", email: "will@kimlabs.co", initials: "WK", name: "William Kim" },
  { amount: "+$39.00", email: "sofia@davis.design", initials: "SD", name: "Sofia Davis" },
];

export type DeployStatus = "Ready" | "Building" | "Failed";

export const DEPLOYMENTS: {
  id: string;
  service: string;
  branch: string;
  status: DeployStatus;
  duration: string;
  author: string;
  age: string;
}[] = [
  { age: "2m", author: "AM", branch: "main", duration: "48s", id: "dpl_8f2k", service: "web-app", status: "Ready" },
  {
    age: "6m",
    author: "JL",
    branch: "feat/rate-limits",
    duration: "1m 12s",
    id: "dpl_7c1q",
    service: "api-gateway",
    status: "Building",
  },
  { age: "21m", author: "IN", branch: "main", duration: "39s", id: "dpl_6z9w", service: "billing", status: "Ready" },
  { age: "1h", author: "WK", branch: "fix/typos", duration: "17s", id: "dpl_5r4t", service: "docs", status: "Failed" },
  {
    age: "3h",
    author: "SD",
    branch: "exp/new-nav",
    duration: "52s",
    id: "dpl_4m8p",
    service: "web-app",
    status: "Ready",
  },
  { age: "5h", author: "AM", branch: "main", duration: "1m 03s", id: "dpl_3h2v", service: "worker", status: "Ready" },
];
