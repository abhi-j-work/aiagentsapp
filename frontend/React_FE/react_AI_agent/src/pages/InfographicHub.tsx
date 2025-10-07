// InfographicHub.tsx
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cpu, BookOpen, Shield } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import clsx from 'clsx';

/* -----------------------------
   Hook for 3D tilt effect
----------------------------- */
function useCardTilt(ref: React.RefObject<HTMLDivElement>) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-50, 50], [10, -10]);
  const rotateY = useTransform(x, [-50, 50], [-10, 10]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const py = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      x.set(px * 50);
      y.set(py * 50);
    };

    const handleLeave = () => {
      x.set(0);
      y.set(0);
    };

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', handleLeave);

    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
    };
  }, [ref, x, y]);

  return { rotateX, rotateY };
}

/* -----------------------------
   Card Data
----------------------------- */
const INFOGRAPHICS = [
  {
    id: 'ai-governance',
    title: 'AI Governance',
    description:
      'Interactive infographic showcasing automated data governance workflow, AI-driven PII classification, and business impact.',
    icon: ShieldCheck,
    link: '/ai-governance-infographic',
    color: 'cyan',
  },
  {
    id: 'qa-domain-ai-agent',
    title: 'Domain AI Agent',
    description:
      'Visualizes how a domain-specific AI agent answers user queries accurately and efficiently.',
    icon: Cpu,
    link: '/qa-domain-ai-agent-infographic',
    color: 'purple',
  },
{
  id: 'security-ai',
  title: 'AI Security',
  description:
    'Modern Zero Trust, RAG enrichment, MCP tool actions, and multi-step reasoning for audit-ready defense.',
  icon: Shield,
  link: '/security-info',
  color: 'indigo',
},
];

const cardColors = {
  cyan: 'from-cyan-600/10 to-cyan-500/6 border-cyan-500/20',
  purple: 'from-violet-600/10 to-purple-500/6 border-purple-500/20',
  amber: 'from-amber-600/10 to-amber-500/6 border-amber-500/20',
};

/* -----------------------------
   Hub Component
----------------------------- */
const InfographicHub: React.FC = () => {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 text-white py-16 px-4">
      <div className="container mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-300">
          Data Governance Hub
        </h1>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Explore our interactive AI and Data Governance. Hover and click any card below to dive deeper.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {INFOGRAPHICS.map((inf) => {
          const Icon = inf.icon;
          const ref = useRef<HTMLDivElement | null>(null);
          const { rotateX, rotateY } = useCardTilt(ref);

          return (
            <motion.div
              key={inf.id}
              ref={ref}
              style={{ rotateX, rotateY, perspective: 800 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className={clsx(
                'relative rounded-2xl p-6 md:p-8 border shadow-xl backdrop-blur-xl bg-gradient-to-br cursor-pointer transition-transform duration-300',
                cardColors[inf.color as keyof typeof cardColors],
                'border-opacity-30'
              )}
            >
              <Link to={inf.link} className="absolute inset-0 z-10" />
              <div className="relative z-20 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-white/6 border border-white/6 shadow-md">
                    <Icon className="w-7 h-7 text-white/90" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-white">{inf.title}</h3>
                </div>
                <p className="text-slate-300 text-sm">{inf.description}</p>
                <div className="mt-auto flex items-center justify-end text-xs text-slate-400">
                  <span className="underline">View Details →</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
};

export default InfographicHub;
