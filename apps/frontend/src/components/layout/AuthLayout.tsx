import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Branding Panel */}
      <div className="hidden lg:flex flex-col items-start justify-between bg-brand-600 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 h-64 w-64 rounded-full bg-white" />
          <div className="absolute bottom-20 right-10 h-48 w-48 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/3 h-32 w-32 rounded-full bg-white" />
        </div>
        <Link to="/" className="flex items-center gap-2 z-10">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">
            F
          </div>
          <span className="text-xl font-display font-bold">FlowBoard</span>
        </Link>
        <div className="z-10 space-y-6">
          <blockquote className="text-2xl font-display font-semibold leading-relaxed">
            "The platform that turned our chaotic sprints into a well-oiled machine."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              AS
            </div>
            <div>
              <p className="font-medium">Alex Santiago</p>
              <p className="text-sm text-white/70">Engineering Lead, Vercel</p>
            </div>
          </div>
        </div>
        <div className="z-10 flex gap-4">
          {[
            { label: '50K+', desc: 'Teams' },
            { label: '2M+', desc: 'Tasks shipped' },
            { label: '99.9%', desc: 'Uptime' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold font-display">{stat.label}</p>
              <p className="text-sm text-white/70">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex items-center justify-center p-8 bg-background">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">
                F
              </div>
              <span className="text-xl font-display font-bold">FlowBoard</span>
            </Link>
          </div>
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
