import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  BarChart3,
  Kanban,
  Bell,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  {
    icon: Kanban,
    title: 'Five Task Views',
    desc: 'Kanban, List, Table, Calendar, and Gantt — visualize work your way.',
  },
  {
    icon: Zap,
    title: 'Automation Engine',
    desc: 'No-code rules: when X happens, do Y. Move tasks, notify teams, set fields.',
  },
  {
    icon: Bot,
    title: 'AI Intelligence',
    desc: 'Paste a goal, get a structured task breakdown. Instant sprint planning.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Velocity, burndown, cycle time, workload heatmap. Export to PDF or CSV.',
  },
  {
    icon: Shield,
    title: 'Enterprise RBAC',
    desc: 'Owner, Admin, Manager, Member, Viewer roles with workspace + project overrides.',
  },
  {
    icon: Bell,
    title: 'Live Collaboration',
    desc: 'Real-time updates, cursor presence, @mentions, and threaded comments.',
  },
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    desc: 'For individuals and small teams',
    features: ['Up to 5 members', '3 projects', '1GB storage', 'Basic analytics'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$14',
    period: '/member/month',
    desc: 'For growing teams shipping at speed',
    features: [
      'Unlimited members',
      'Unlimited projects',
      '50GB storage',
      'AI task intelligence',
      'Automation rules',
      'Advanced analytics',
      'Custom fields',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large orgs with compliance needs',
    features: [
      'Everything in Pro',
      'SSO / SAML',
      'Audit logs',
      'SLA guarantees',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Contact sales',
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="font-display font-bold text-base">FlowBoard</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button variant="brand" size="sm" asChild>
              <Link to="/signup">
                Get started <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 text-center px-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 via-transparent to-transparent dark:from-brand-950/20" />
        <motion.div
          className="mx-auto max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="brand" className="mb-6 text-xs font-medium">
            🚀 New: AI Sprint Planning is live
          </Badge>
          <h1 className="text-5xl font-display font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Ship faster.
            <br />
            <span className="text-brand-500">Together.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            FlowBoard is the team intelligence platform that replaces your spreadsheets, scattered
            Slack threads, and six other tools — with one beautifully unified workspace.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button variant="brand" size="xl" asChild>
              <Link to="/signup">
                Start for free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/login">See demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required · Free forever plan · 2-minute setup
          </p>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          className="mx-auto mt-16 max-w-5xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
            <div className="flex h-8 items-center gap-1.5 bg-muted/50 px-4">
              {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map((c) => (
                <div key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />
              ))}
            </div>
            <div className="grid grid-cols-5 gap-0 h-64 bg-background">
              <div className="col-span-1 border-r bg-muted/20 p-3 space-y-2">
                {['Dashboard', 'Projects', 'Tasks', 'Inbox', 'Analytics'].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent">
                    <div className="h-3 w-3 rounded bg-muted" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="col-span-4 p-4 space-y-3">
                <div className="flex gap-3">
                  {['bg-blue-100 dark:bg-blue-950', 'bg-green-100 dark:bg-green-950', 'bg-red-100 dark:bg-red-950', 'bg-purple-100 dark:bg-purple-950'].map((c, i) => (
                    <div key={i} className={`flex-1 rounded-xl ${c} p-3 space-y-1`}>
                      <div className="h-6 w-8 rounded bg-white/50 dark:bg-black/20" />
                      <div className="h-2 w-12 rounded bg-white/50 dark:bg-black/20" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
                      <div className="h-2.5 w-full rounded bg-muted" />
                      <div className="h-2 w-3/4 rounded bg-muted" />
                      <div className="flex gap-1">
                        <div className="h-4 w-10 rounded-full bg-brand-100 dark:bg-brand-950" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-muted-foreground/50">
            {['Acme Corp', 'Vercel', 'Linear', 'Notion', 'Figma', 'Stripe'].map((name) => (
              <span key={name} className="text-sm font-display font-bold tracking-tight">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold">Everything your team needs</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Built by engineers who got tired of context-switching between five tools.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                className="rounded-xl border bg-card p-6 space-y-3"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
              >
                <div className="inline-flex rounded-xl bg-brand-50 dark:bg-brand-950 p-2.5">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-muted/20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold">Simple, honest pricing</h2>
            <p className="mt-4 text-muted-foreground">Scale up when your team grows. Downgrade anytime.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PRICING.map(({ name, price, period, desc, features, cta, highlight }) => (
              <div
                key={name}
                className={`rounded-2xl border p-6 space-y-6 ${highlight ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 relative' : 'bg-card'}`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="brand" className="text-xs">Most popular</Badge>
                  </div>
                )}
                <div>
                  <h3 className="font-display font-bold">{name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-display font-bold">{price}</span>
                    <span className="text-sm text-muted-foreground">{period}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                </div>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={highlight ? 'brand' : 'outline'}
                  className="w-full"
                  asChild
                >
                  <Link to="/signup">{cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <motion.div
          className="mx-auto max-w-2xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-display font-bold">
            Ready to ship smarter?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join 50,000+ teams that replaced their chaos with FlowBoard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="brand" size="xl" asChild>
              <Link to="/signup">
                Start for free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-brand-500 flex items-center justify-center text-white text-xs font-bold">F</div>
            <span className="font-display font-bold text-sm">FlowBoard</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FlowBoard. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
