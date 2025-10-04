// DomainAIAgentInfographic.tsx
import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import {
  Cpu,
  Database,
  BookOpen,
  GitBranch,
  Puzzle,
  Layers,
  Zap,
  Box,
  Brain,
  GitPullRequest,
  Globe,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * DomainAIAgentInfographic.tsx
 *
 * Single-file, self-contained infographic page that visualizes:
 * Custom Model Training -> RAG -> GraphRAG (HybridRAG) -> Multi-step Reasoning -> AI Agent output
 *
 * Features:
 * - Parallax layers (pointer + scroll)
 * - Motion-chained transitions via framer-motion
 * - Glassmorphism + 3D tilt aesthetics
 * - Accessible HTML structure and small helper hooks
 *
 * Usage:
 * import DomainAIAgentInfographic from './DomainAIAgentInfographic';
 * <DomainAIAgentInfographic />
 *
 * Required packages:
 * - framer-motion
 * - lucide-react
 * - clsx (optional)
 */

/* ---------------------------
   Small helpers & constants
   --------------------------- */
const STEPS = [
  {
    id: 'train',
    title: 'Train Custom Domain Model',
    subtitle: 'Fine-tune on domain-specific labeled & unlabeled data',
    bullets: [
      'Curate domain corpus (logs, docs, policies)',
      'Fine-tune foundation model & produce domain embeddings',
      'Track experiments (MLflow / tracking)',
    ],
    icon: Brain,
    color: 'cyan',
  },
  {
    id: 'rag',
    title: 'RAG — Retrieval Augmented Generation',
    subtitle: 'Index domain documents and expose context to LLMs',
    bullets: [
      'Vectorize docs via domain embeddings',
      'Efficient vector store retrieval (FAISS / Milvus etc.)',
      'Short-term context assembly for prompts',
    ],
    icon: BookOpen,
    color: 'purple',
  },
  {
    id: 'graphrag',
    title: 'GraphRAG (HybridRAG)',
    subtitle: 'Combine vectors + semantic graph for structured retrieval',
    bullets: [
      'Build knowledge graph (entities, relations)',
      'Hybrid queries: vector + graph constraints',
      'Context ranking using graph signals',
    ],
    icon: GitBranch,
    color: 'amber',
  },
  {
    id: 'reason',
    title: 'Multi-Step Reasoning Engine',
    subtitle: 'Decompose tasks into reasoning sub-steps & verify',
    bullets: [
      'Chain-of-thought + plan decomposition',
      'LLM-as-judge to validate sub-outputs',
      'Multi-agent orchestration for parallel steps',
    ],
    icon: Puzzle,
    color: 'teal',
  },
  {
    id: 'agent',
    title: 'Domain-Aware AI Agent',
    subtitle: 'Synthesize domain knowledge to provide unique, actionable output',
    bullets: [
      'Cross-checks outputs against domain constraints',
      'Generates auditable, governance-ready actions',
      'Produces insights beyond general-purpose LLMs',
    ],
    icon: Box,
    color: 'rose',
  },
] as const;

/* ---------------------------
   Motion variants
   --------------------------- */
const containerVariant = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.18,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18, scale: 0.995 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.2, 0.9, 0.3, 1] } },
};

const stepCardVariant = {
  hidden: { opacity: 0, y: 36, rotateX: -6, transformPerspective: 800 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.2, 0.9, 0.3, 1] },
  }),
};

/* ---------------------------
   Parallax / pointer effect hook
   --------------------------- */
function usePointerParallax(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handlePointer = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 -> 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--px', String(px));
      el.style.setProperty('--py', String(py));
    };
    window.addEventListener('pointermove', handlePointer);
    return () => window.removeEventListener('pointermove', handlePointer);
  }, [containerRef]);
}

/* ---------------------------
   Component: Hero
   --------------------------- */
const Hero: React.FC = () => {
  return (
    <header className="relative z-10 py-20 md:py-28">
      <div className="container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-3 mb-6 justify-center">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse" />
          <span className="uppercase tracking-widest text-sm text-slate-300">Domain Intelligence</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300">
          From Domain Data to Autonomous AI Agents
        </h1>
        <p className="mt-6 text-slate-300 max-w-3xl mx-auto">
          Step-by-step visualization of how domain-specific models, RAG, GraphRAG and multi-step reasoning coalesce into a
          domain-aware AI agent that delivers governance-grade outputs no generic model can produce.
        </p>
      </div>
    </header>
  );
};

/* ---------------------------
   Component: StepCard
   --------------------------- */
const StepCard: React.FC<{
  idx: number;
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
  icon: React.ElementType;
  color: string;
}> = ({ idx, id, title, subtitle, bullets, icon: Icon, color }) => {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: '-10% 0px -10% 0px' });

  useEffect(() => {
    if (inView) controls.start('show');
  }, [controls, inView]);

  const colorBg = {
    cyan: 'from-cyan-600/10 to-cyan-500/6 border-cyan-500/20',
    purple: 'from-violet-600/10 to-purple-500/6 border-purple-500/20',
    amber: 'from-amber-600/10 to-amber-500/6 border-amber-500/20',
    teal: 'from-teal-600/10 to-teal-500/6 border-teal-500/20',
    rose: 'from-rose-600/10 to-rose-500/6 border-rose-500/20',
  }[color as keyof typeof colorBg];

  return (
    <motion.article
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={stepCardVariant}
      custom={idx}
      className={clsx(
        'relative w-full md:w-3/5 lg:w-2/5 mx-auto',
        'rounded-2xl p-6 md:p-8 border shadow-xl backdrop-blur-xl bg-gradient-to-br',
        colorBg,
        'border-opacity-30'
      )}
      data-step-id={id}
      aria-label={`${title} step`}
    >
      {/* 3D glass sheen & depth */}
      <div
        className="absolute -inset-0.5 rounded-2xl -z-10 blur-3xl opacity-30"
        style={{
          background: 'linear-gradient(120deg, rgba(99,102,241,0.06), rgba(14,165,233,0.04))',
        }}
      />

      <div className="flex items-start gap-4">
        <div
          className={clsx(
            'flex items-center justify-center w-14 h-14 rounded-lg shrink-0 shadow-md',
            'bg-white/6 border border-white/6'
          )}
        >
          <Icon className="w-7 h-7 text-white/90" />
        </div>

        <div className="flex-1">
          <h3 className="text-xl md:text-2xl font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-300 mt-1">{subtitle}</p>

          <ul className="mt-4 text-sm text-slate-300 space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-2 h-2 mt-2 rounded-full bg-white/40 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* subtle footer / animation cue */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
        <div>Layer {idx + 1}</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/8 animate-pulse" />
          <div>Active</div>
        </div>
      </div>
    </motion.article>
  );
};

/* ---------------------------
   Component: Timeline (stacked with motion chain)
   --------------------------- */
const Timeline: React.FC = () => {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });

  useEffect(() => {
    if (inView) controls.start('show');
  }, [controls, inView]);

  return (
    <section ref={ref} className="py-16 md:py-20 relative z-10">
      <motion.div initial="hidden" animate={controls} variants={containerVariant} className="space-y-12 container mx-auto px-4">
        {STEPS.map((s, i) => (
          <motion.div key={s.id} variants={fadeUp} className="flex flex-col md:flex-row md:items-center md:gap-8">
            {/* left: timeline indicator */}
            <div className="md:w-1/4 flex md:flex-col items-center md:items-end md:pr-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/6 flex items-center justify-center border border-white/8 shadow-md">
                  <span className="text-sm font-semibold text-white">{i + 1}</span>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-sm font-semibold text-white">{s.title}</div>
                  <div className="text-xs text-slate-400">{s.subtitle}</div>
                </div>
              </div>
            </div>

            {/* right: card */}
            <div className="md:w-3/4">
              <StepCard idx={i} {...s} />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

/* ---------------------------
   Component: Architecture Strip (interactive, hybrid RAG highlight)
   --------------------------- */
const ArchitectureStrip: React.FC = () => {
  return (
    <section className="py-12 md:py-16 relative z-10">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">Architecture — Hybrid Retrieval & Reasoning</h2>

        <div className="bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-700/40 p-6 md:p-10 shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-center">
            {/* Data ingestion */}
            <div className="col-span-1 md:col-span-1 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white/6 to-white/3 border border-white/6 flex items-center justify-center shadow">
                <Database className="w-8 h-8" />
              </div>
              <div className="mt-3 text-sm text-slate-300 font-medium">Data Ingest</div>
            </div>

            {/* Training */}
            <div className="col-span-1 md:col-span-1 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white/6 border border-white/6 flex items-center justify-center shadow">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="mt-3 text-sm text-slate-300 font-medium">Train Model</div>
            </div>

            {/* RAG */}
            <div className="col-span-1 md:col-span-1 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white/6 border border-white/6 flex items-center justify-center shadow">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="mt-3 text-sm text-slate-300 font-medium">RAG</div>
            </div>

            {/* GraphRAG */}
            <div className="col-span-1 md:col-span-1 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white/6 border border-white/6 flex items-center justify-center shadow">
                <GitBranch className="w-8 h-8" />
              </div>
              <div className="mt-3 text-sm text-slate-300 font-medium">GraphRAG</div>
            </div>

            {/* Reasoning */}
            <div className="col-span-1 md:col-span-1 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white/6 border border-white/6 flex items-center justify-center shadow">
                <Puzzle className="w-8 h-8" />
              </div>
              <div className="mt-3 text-sm text-slate-300 font-medium">Reasoning</div>
            </div>

            {/* Agent output */}
            <div className="col-span-1 md:col-span-1 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white/6 border border-white/6 flex items-center justify-center shadow">
                <Box className="w-8 h-8" />
              </div>
              <div className="mt-3 text-sm text-slate-300 font-medium">Agent Output</div>
            </div>
          </div>

          {/* flow lines (svg) */}
          <svg className="absolute inset-0 pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="flowGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* curved flows between centers */}
            <g stroke="url(#flowGrad)" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeDasharray="8 6" opacity={0.9}>
              {/* manually positioned paths that look good on many widths */}
              <path d="M 14% 56% C 22% 48%, 30% 48%, 36% 56%" />
              <path d="M 36% 56% C 44% 64%, 52% 64%, 58% 56%" />
              <path d="M 58% 56% C 66% 48%, 74% 48%, 82% 56%" />
            </g>

            {/* moving orb */}
            <circle r="7" fill="#7c3aed" opacity="0.9" style={{ transform: 'translateX(-20px)', animation: 'moveOrb 6s linear infinite' }} />
            <style>{`
              @keyframes moveOrb {
                0% { transform: translateX(-30%) translateY(4%); opacity: 0 }
                10% { opacity: 1 }
                50% { transform: translateX(40%) translateY(4%) }
                90% { opacity: 1 }
                100% { transform: translateX(120%) translateY(4%); opacity: 0 }
              }
            `}</style>
          </svg>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------
   Component: Concluding CTA / Summary (glassy panel)
   --------------------------- */
const Conclusion: React.FC = () => {
  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl rounded-2xl p-8 md:p-12 border border-slate-700/40 bg-gradient-to-bl from-white/3 to-white/2 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">Why a Domain-Aware AI Agent?</h3>
              <p className="text-slate-300">
                By combining a domain-trained model with RAG and GraphRAG and orchestrating multi-step reasoning (with self-judging
                validations), the resulting AI Agent delivers auditable, context-aware outputs that general-purpose models cannot
                reliably produce.
              </p>
            </div>
            <div className="flex-shrink-0 grid grid-cols-1 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/40 text-sm">
                <div className="font-semibold text-white">Trustworthy</div>
                <div className="text-slate-300 text-xs">Validated by LLM-as-judge & graph constraints</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/40 text-sm">
                <div className="font-semibold text-white">Explainable</div>
                <div className="text-slate-300 text-xs">Step traces & audit trails for governance</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">Custom Model</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">RAG</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">GraphRAG</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">Reasoning</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">Audit Trail</span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------
   Full Page Component
   --------------------------- */
const DomainAIAgentInfographic: React.FC = () => {
  const pageRef = useRef<HTMLElement | null>(null);
  usePointerParallax(pageRef);

  useEffect(() => {
    // small accessibility improvement: reduce-motion respects user preferences
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      document.documentElement.style.setProperty('scroll-behavior', 'auto');
    }
    return () => {};
  }, []);

  return (
    <main ref={pageRef} className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 min-h-screen text-white overflow-x-hidden">
      {/* layered decorative backgrounds for depth */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 10% 15%, rgba(59,130,246,0.08), transparent 10%), radial-gradient(ellipse at 90% 85%, rgba(168,85,247,0.06), transparent 8%)',
        }}
      />

      {/* subtle grid overlay */}
      <div aria-hidden className="absolute inset-0 -z-10 opacity-5 bg-[repeating-linear-gradient(0deg,#0000_0px,#0000_1px,rgba(255,255,255,0.01)_1px,rgba(255,255,255,0.00)_4px)]" />

      <Hero />

      <Timeline />

      <ArchitectureStrip />

      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Multi-step Reasoning — How it Orchestrates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl p-6 bg-slate-900/30 border border-slate-700/40 backdrop-blur-md">
              <h4 className="font-semibold text-white mb-2">Plan</h4>
              <p className="text-slate-300 text-sm">Decompose complex tasks into smaller sub-goals & decide retrieval targets (RAG/GraphRAG).</p>
              <div className="mt-4 text-xs text-slate-400">Example: Identify PII columns → propose masking policy → validate SQL</div>
            </div>

            <div className="rounded-xl p-6 bg-slate-900/30 border border-slate-700/40 backdrop-blur-md">
              <h4 className="font-semibold text-white mb-2">Execute</h4>
              <p className="text-slate-300 text-sm">Run agents in parallel/sequentially; fetch evidence from hybrid retrieval; synthesize intermediate outputs.</p>
              <div className="mt-4 text-xs text-slate-400">Example: Run NL-to-SQL module → verify column types → mask values</div>
            </div>

            <div className="rounded-xl p-6 bg-slate-900/30 border border-slate-700/40 backdrop-blur-md">
              <h4 className="font-semibold text-white mb-2">Verify & Judge</h4>
              <p className="text-slate-300 text-sm">LLM-as-judge uses schema & domain constraints to validate sub-results; failing steps are re-routed for refinement.</p>
              <div className="mt-4 text-xs text-slate-400">Example: Reject masks that break joins; rerun reasoning with adjusted prompt</div>
            </div>
          </div>
        </div>
      </section>

      <Conclusion />

      <footer className="py-12 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} · Domain AI Agent — Visual infographic
      </footer>
    </main>
  );
};

export default DomainAIAgentInfographic;
