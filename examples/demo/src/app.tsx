import { useState } from "react";
import { Swarm, SwarmProvider, withSwarm } from "react-cursor-swarm";

/* ---------------------------------------------------------------- sections */

const Nav = () => (
  <nav className="nav">
    <div className="brand">
      <span className="logo" />
      Hivemind
    </div>
    <div className="links">
      <a href="#features">Features</a>
      <a href="#dash">Dashboard</a>
      <a href="#pricing">Pricing</a>
      <a href="#signup">Docs</a>
    </div>
    <button type="button" className="btn ghost">
      Sign in
    </button>
    <button type="button" className="btn primary">
      Get started
    </button>
  </nav>
);

const Hero = () => (
  <header className="hero">
    <div className="hero-copy">
      <span className="pill">New · v2.0 just shipped</span>
      <h1>Interfaces that build themselves.</h1>
      <p className="lead">
        Wrap any React component and a swarm of multiplayer cursors draws its boxes, types its copy and ⌥-drags its
        repeated cards into place. When they&apos;re done, it&apos;s just your component.
      </p>
      <div className="row">
        <button type="button" className="btn primary lg">
          Start building
        </button>
        <button type="button" className="btn lg outline">
          Read the docs
        </button>
      </div>
    </div>
    <div className="window">
      <div className="window-bar">
        <i />
        <i />
        <i />
      </div>
      <div className="window-body">
        <div className="metric">
          <span className="muted">Weekly builds</span>
          <strong>12,480</strong>
          <span className="up">▲ 18.2%</span>
        </div>
        <svg className="chart" viewBox="0 0 300 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#7c5cff" stopOpacity=".45" />
              <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 90 L30 80 L60 84 L90 60 L120 66 L150 44 L180 52 L210 30 L240 38 L270 18 L300 22 L300 110 L0 110 Z"
            fill="url(#g)"
          />
          <path
            d="M0 90 L30 80 L60 84 L90 60 L120 66 L150 44 L180 52 L210 30 L240 38 L270 18 L300 22"
            fill="none"
            stroke="#7c5cff"
            strokeWidth="2.5"
          />
        </svg>
      </div>
    </div>
  </header>
);

const FEATURES = [
  {
    body: "Animates your actual elements, so state, events and styles stay intact.",
    icon: "◆",
    title: "Real DOM, no clone",
  },
  {
    body: "Text is revealed keystroke by keystroke with the CSS Highlight API. Zero layout shift.",
    icon: "✎",
    title: "Typed in place",
  },
  {
    body: "Repeated siblings are ⌥-dragged from the first one, with live spacing guides.",
    icon: "⧉",
    title: "Smart duplicates",
  },
  {
    body: "Sections build as they enter the viewport; cursors chase you down the page.",
    icon: "◎",
    title: "Scroll aware",
  },
  {
    body: "One dependency-free engine. React bindings are a thin layer on top.",
    icon: "⚡",
    title: "Tiny & framework-light",
  },
  {
    body: "Users with reduced motion get the finished component instantly.",
    icon: "♿",
    title: "Respects motion prefs",
  },
];

const Features = () => (
  <section className="section" id="features">
    <h2>Everything a design file has, minus the file</h2>
    <p className="muted center">
      Six cards from one <code>.map()</code>: watch the first get built and the rest get duplicated.
    </p>
    <div className="grid3">
      {FEATURES.map((f) => (
        <article className="card" key={f.title}>
          <span className="icon">{f.icon}</span>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </article>
      ))}
    </div>
  </section>
);

// The HOC form: same thing as wrapping in <Swarm>.
const StatCard = ({ label, value, delta }: { label: string; value: string; delta: string }) => (
  <div className="stat">
    <span className="muted">{label}</span>
    <strong>{value}</strong>
    <span className={delta.startsWith("-") ? "down" : "up"}>{delta}</span>
  </div>
);
const SwarmStat = withSwarm(StatCard, { trigger: "visible" });

const ROWS = [
  { name: "checkout-flow", owner: "Ada", status: "Live", time: "2m ago" },
  { name: "onboarding-v3", owner: "Grace", status: "Review", time: "14m ago" },
  { name: "pricing-table", owner: "Linus", status: "Live", time: "1h ago" },
  { name: "settings-panel", owner: "Hedy", status: "Draft", time: "3h ago" },
];

const Dashboard = () => (
  <section className="section" id="dash">
    <h2>Dashboards too</h2>
    <p className="muted center">
      Each stat card below is its own <code>withSwarm(StatCard)</code>; the table is one <code>&lt;Swarm&gt;</code>.
    </p>
    <div className="grid3">
      <SwarmStat label="Components built" value="1,284" delta="+12.4%" />
      <SwarmStat label="Avg. build time" value="2.1s" delta="-8.0%" />
      <SwarmStat label="Cursors online" value="48" delta="+4" />
    </div>
    <Swarm>
      <div className="table">
        <div className="thead">
          <span>Component</span>
          <span>Owner</span>
          <span>Status</span>
          <span>Updated</span>
        </div>
        {ROWS.map((r) => (
          <div className="tr" key={r.name}>
            <span className="mono">{r.name}</span>
            <span>{r.owner}</span>
            <span>
              <em className={`status ${r.status.toLowerCase()}`}>{r.status}</em>
            </span>
            <span className="muted">{r.time}</span>
          </div>
        ))}
      </div>
    </Swarm>
  </section>
);

const TIERS = [
  { blurb: "For side projects", name: "Hobby", perks: ["3 cursors", "Community support", "MIT licensed"], price: "$0" },
  {
    blurb: "For product teams",
    hot: true,
    name: "Team",
    perks: ["12 cursors", "Custom colors", "Priority support"],
    price: "$24",
  },
  {
    blurb: "For whole orgs",
    name: "Scale",
    perks: ["Unlimited cursors", "Custom names & colors", "SLA"],
    price: "$99",
  },
];

const Pricing = () => (
  <section className="section" id="pricing">
    <h2>Pricing</h2>
    <p className="muted center">(It&apos;s a demo. The package is free.)</p>
    <div className="grid3">
      {TIERS.map((t) => (
        <div className={`tier${t.hot ? " hot" : ""}`} key={t.name}>
          <h3>{t.name}</h3>
          <p className="muted">{t.blurb}</p>
          <div className="price">
            {t.price}
            <small>/mo</small>
          </div>
          <hr />
          <ul>
            {t.perks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <button type="button" className={`btn ${t.hot ? "primary" : "outline"} block`}>
            Choose {t.name}
          </button>
        </div>
      ))}
    </div>
  </section>
);

const Signup = () => {
  const [email, setEmail] = useState("");
  return (
    <section className="section" id="signup">
      <form className="signup" onSubmit={(e) => e.preventDefault()}>
        <h2>Get the swarm in your inbox</h2>
        <p className="muted">The form stays fully interactive: try typing once it&apos;s built.</p>
        <div className="row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          <button type="button" className="btn primary">
            Subscribe
          </button>
        </div>
        <label className="check">
          <input type="checkbox" defaultChecked /> Send me release notes
        </label>
      </form>
    </section>
  );
};

/* ---------------------------------------------------------------- app */

export const App = () => (
  // Every swarm setting lives here, in code. Change a value and the swarm follows.
  <SwarmProvider
    agents={15}
    speed={3}
    detail="full"
    finale="flock"
    flock={{ fleeRadius: 110, radius: 140, randomness: 0.6, speed: 260 }}
  >
    <div className="page">
      <Swarm trigger="mount">
        <Nav />
      </Swarm>
      <Swarm trigger="mount" delay={250}>
        <Hero />
      </Swarm>
      <Swarm>
        <Features />
      </Swarm>
      <Dashboard />
      <Swarm>
        <Pricing />
      </Swarm>
      <Swarm>
        <Signup />
      </Swarm>
      <footer className="footer">
        Once there&apos;s nothing left to build, the swarm flocks to your pointer. Try chasing it.
        <br />
        Built with <code>react-cursor-swarm</code>. Idea: Swarm by Joel Califa &amp; Swarm Rebuild by Dhvanil Patel.
      </footer>
    </div>
  </SwarmProvider>
);
