// SecurityInfographic.tsx
import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import {
  Cpu,
  Database,
  BookOpen,
  GitBranch,
  Puzzle,
  Zap,
  Box,
  Brain,
  Shield,
  Lock,
  ClipboardList,
  FileText,
  CheckCircle,
  GitPullRequest,
  Layers,
  Tag as Tags,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Enhancements:
 * - Split all steps into concise bullets with brief descriptions (not just 3 lines).
 * - Add glassy sheen sweep, pointer-tilt, hover glow, and subtle float pulses.
 * - Keep Tools (MCP) step and Architecture “Tools (MCP)” block.
 * - Train step shows Knowledge Inputs as plain text bullets.
 */

/* ---------------------------
   Animations & variants
   --------------------------- */
const containerVariant = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.16 },
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
    transition: { duration: 0.7, delay: i * 0.06, ease: [0.2, 0.9, 0.3, 1] },
  }),
};

/* ---------------------------
   Parallax / pointer effect
   --------------------------- */
function usePointerParallax(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handlePointer = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--px', String(px));
      el.style.setProperty('--py', String(py));
    };
    window.addEventListener('pointermove', handlePointer);
    return () => window.removeEventListener('pointermove', handlePointer);
  }, [containerRef]);
}

/* ---------------------------
   Data: Steps with brief bullets
   --------------------------- */
const STEPS = [
  {
    id: 'train',
    title: 'Train Security Models',
    subtitle: 'Knowledge inputs for governed detections and embeddings',
    bullets: [
      'Policies & Standards — NIST, CIS, ISO controls as canonical references',
      'Runbooks & Playbooks — SOC/IR procedures for guided response',
      'SIEM/EDR Logs — normalized telemetry for patterns and baselines',
      'Threat Intel — TTPs, IOCs, CVEs, and ATT&CK mappings',
      'Asset/CMDB — inventory, business criticality, and owners',
      'Past Incidents — timelines, RCA, and remediation artifacts',
      'Vuln Scans & SBOMs — exposures, components, and versions',
    ],
    icon: Brain,
    color: 'cyan',
  },
  {
    id: 'iam',
    title: 'Identity & Access Management',
    subtitle: 'Zero Trust identity with strong auth and least privilege',
    bullets: [
      'Federation — SSO/OIDC/OAuth2 across apps and providers',
      'MFA/Passkeys — phishing‑resistant authentication defaults',
      'JIT/JEA — scoped, time‑bounded privileged access',
      'RBAC/ABAC — policy guardrails and separation of duties',
      'Session Control — continuous monitoring and revocation',
    ],
    icon: Lock,
    color: 'purple',
  },
  {
    id: 'data',
    title: 'Data Security & Privacy',
    subtitle: 'Classification, encryption, masking, and DLP controls',
    bullets: [
      'Discovery & Tags — sensitivity labels and lineage',
      'Encryption — at rest/in transit via KMS and TLS 1.3',
      'Tokenization/Masking — protect PII and secrets by policy',
      'DLP/Egress — prevent exfiltration with monitored rules',
      'Key Hygiene — rotation, HSM, and attestations',
    ],
    icon: Database,
    color: 'amber',
  },
  {
    id: 'detect',
    title: 'Threat Detection & RAG',
    subtitle: 'Correlate signals and enrich investigations with context',
    bullets: [
      'Rules & Baselines — Sigma/KQL tuned for environment',
      'Embeddings — tactic/technique similarity for triage',
      'Chunked Runbooks — stepwise responder guidance',
      'Vector Store — rapid retrieval for enrichment',
      'Reranking — safety filters to improve fidelity',
    ],
    icon: BookOpen,
    color: 'teal',
  },
  {
    id: 'tools',
    title: 'Tool Use & Actions (MCP)',
    subtitle: 'Invoke external tools/APIs to execute security tasks',
    bullets: [
      'MCP Protocol — standardized tool interface and resources',
      'Actions — query SIEM, isolate host, rotate keys, open ticket',
      'Observations — return results as grounded evidence',
      'Safety — scoped, auditable permissions and logs',
    ],
    icon: Zap,
    color: 'indigo',
  },
  {
    id: 'respond',
    title: 'Incident Response & Resilience',
    subtitle: 'Contain, eradicate, recover, and harden',
    bullets: [
      'SOAR Playbooks — automation with approvals and guardrails',
      'Forensics — timeline reconstruction and evidence preservation',
      'Containment — revoke tokens, disable creds, quarantine hosts',
      'Post‑Incident — RCA, lessons learned, and backlogs',
      'Resilience — tabletop exercises and drills',
    ],
    icon: Shield,
    color: 'rose',
  },
] as const;

/* ---------------------------
   Hero
   --------------------------- */
const Hero: React.FC = () => {
  return (
    <header className="relative z-10 py-20 md:py-28">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.9, 0.3, 1] }}
          className="inline-flex items-center gap-3 mb-6 justify-center"
        >
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse" />
          <span className="uppercase tracking-widest text-sm text-slate-300">Security Intelligence</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300"
        >
          From Zero Trust to Autonomous Defense
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-slate-300 max-w-3xl mx-auto"
        >
          Visualization of governed detections, RAG enrichment, MCP tool actions, and multi‑step reasoning for audit‑ready security operations.
        </motion.p>
      </div>
    </header>
  );
};

/* ---------------------------
   Step Card with glassy effects
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
    indigo: 'from-indigo-600/10 to-indigo-500/6 border-indigo-500/20',
  }[color as keyof any];

  return (
    <motion.article
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={stepCardVariant}
      custom={idx}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={clsx(
        'relative group w-full md:w-3/5 lg:w-2/5 mx-auto',
        'rounded-2xl p-6 md:p-8 border shadow-2xl backdrop-blur-xl bg-gradient-to-br',
        colorBg,
        'border-opacity-30 will-change-transform',
      )}
      style={{
        transform:
          'perspective(1000px) rotateX(calc(var(--py, 0) * -4deg)) rotateY(calc(var(--px, 0) * 4deg))',
      }}
      data-step-id={id}
      aria-label={`${title} step`}
    >
      {/* sheen sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
      >
        <div className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div
            className="absolute left-[-50%] top-0 h-full w-[50%] rotate-12"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%)',
              animation: 'sheen 1.4s ease forwards',
            }}
          />
        </div>
      </div>

      {/* soft glow on hover */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.06)] group-hover:shadow-[0_0_60px_rgba(99,102,241,0.25)] transition-shadow"
      />

      {/* content */}
      <div className="relative flex items-start gap-4">
        <motion.div
          className={clsx(
            'flex items-center justify-center w-14 h-14 rounded-lg shrink-0',
            'bg-white/6 border border-white/10'
          )}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.1 }}
        >
          <Icon className="w-7 h-7 text-white/90" />
        </motion.div>

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

      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
        <div>Layer {idx + 1}</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/8 animate-pulse" />
          <div>Active</div>
        </div>
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes sheen {
          0% { transform: translateX(-120%) rotate(12deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(260%) rotate(12deg); opacity: 0; }
        }
      `}</style>
    </motion.article>
  );
};

/* ---------------------------
   Timeline
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
            {/* left indicator */}
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

            {/* right card */}
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
   Architecture Strip (+ Tools)
   --------------------------- */
const ArchitectureStrip: React.FC = () => {
  return (
    <section className="py-12 md:py-16 relative z-10">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">Architecture — Modern Defense Orchestration</h2>

        <div className="relative bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-700/40 p-6 md:p-10 shadow-2xl overflow-hidden">
          {/* floating blobs */}
          <div aria-hidden className="pointer-events-none absolute -z-10 inset-0">
            <div className="absolute w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full -top-10 -left-8 animate-pulse" />
            <div className="absolute w-72 h-72 bg-purple-500/10 blur-3xl rounded-full bottom-0 right-0 animate-pulse [animation-duration:4.5s]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
            {[
              { Icon: Database, label: 'Asset & Telemetry' },
              { Icon: Cpu, label: 'Train Detections' },
              { Icon: BookOpen, label: 'Detect & RAG' },
              { Icon: GitBranch, label: 'Threat Graph' },
              { Icon: Zap, label: 'Tools (MCP)' },
              { Icon: Puzzle, label: 'Orchestration' },
              { Icon: Box, label: 'Response Output' },
            ].map(({ Icon, label }) => (
              <motion.div
                key={label}
                whileHover={{ y: -3, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="col-span-1 flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white/6 border border-white/6 flex items-center justify-center shadow">
                  <Icon className="w-8 h-8" />
                </div>
                <div className="mt-3 text-sm text-slate-300 font-medium">{label}</div>
              </motion.div>
            ))}
          </div>

          {/* curved flows */}
          <svg className="absolute inset-0 pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="flowGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            <g stroke="url(#flowGrad)" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeDasharray="8 6" opacity={0.9}>
              <path d="M 12% 56% C 20% 48%, 28% 48%, 34% 56%" />
              <path d="M 34% 56% C 42% 64%, 50% 64%, 56% 56%" />
              <path d="M 56% 56% C 62% 48%, 68% 48%, 74% 56%" />
              <path d="M 74% 56% C 80% 64%, 86% 64%, 90% 56%" />
            </g>

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
   Security Lifecycle (governed)
   --------------------------- */
const FINE_TUNE_STEPS = [
  {
    title: 'Classify & Govern',
    detail: 'Discover sensitive/PII fields, tag with policies, and enforce protections across environments.',
    icon: Shield,
    color: 'from-rose-500/15 to-rose-400/10 border-rose-400/25',
  },
  {
    title: 'Harden & Baseline',
    detail: 'Apply CIS/NIST hardening, golden images, and drift‑free baselines.',
    icon: Lock,
    color: 'from-amber-500/15 to-amber-400/10 border-amber-400/25',
  },
  {
    title: 'Detect & Correlate',
    detail: 'Tune rules, correlate EDR/network signals, and enrich with RAG.',
    icon: Brain,
    color: 'from-cyan-500/15 to-cyan-400/10 border-cyan-400/25',
  },
  {
    title: 'Automate & Orchestrate',
    detail: 'Run SOAR playbooks, approvals, and ticketing with MCP tools.',
    icon: GitPullRequest,
    color: 'from-violet-500/15 to-violet-400/10 border-violet-400/25',
  },
  {
    title: 'Validate & Report',
    detail: 'Simulate attacks, verify controls, and produce compliance evidence.',
    icon: CheckCircle,
    color: 'from-teal-500/15 to-teal-400/10 border-teal-400/25',
  },
] as const;

const FineTuneLane: React.FC = () => {
  return (
    <section className="py-12 md:py-16 relative z-10">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
          Security Lifecycle — Governed & Auditable
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {FINE_TUNE_STEPS.map((s) => (
            <motion.div
              key={s.title}
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className={clsx('rounded-2xl p-5 border backdrop-blur-md bg-gradient-to-br', s.color)}
            >
              <div className="flex items-center gap-3">
                <s.icon className="w-6 h-6 text-white/90" />
                <div className="text-white font-semibold">{s.title}</div>
              </div>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">{s.detail}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 text-center text-xs text-slate-400">
          Example: classify/tag → harden/baseline → detect/correlate → automate/orchestrate → validate/report.
        </div>
      </div>
    </section>
  );
};

/* ---------------------------
   Conclusion
   --------------------------- */
const Conclusion: React.FC = () => {
  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl rounded-2xl p-8 md:p-12 border border-slate-700/40 bg-gradient-to-bl from-white/3 to-white/2 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">Why a Security‑First Agent?</h3>
              <p className="text-slate-300">
                Zero Trust controls, governed detections, RAG enrichment, MCP tools, and multi‑step reasoning yield auditable, context‑aware defense.
              </p>
            </div>
            <div className="flex-shrink-0 grid grid-cols-1 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/40 text-sm">
                <div className="font-semibold text-white">Trustworthy</div>
                <div className="text-slate-300 text-xs">Policies, approvals, and verifiable actions</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/40 text-sm">
                <div className="font-semibold text-white">Explainable</div>
                <div className="text-slate-300 text-xs">Evidence, step traces, and audit trails</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">Zero Trust</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">RAG</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">Threat Graph</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">Tools (MCP)</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">Reasoning</span>
            <span className="px-3 py-1 rounded-full bg-white/6 text-xs text-white">Audit Trail</span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------
   Full Page
   --------------------------- */
const SecurityInfographic: React.FC = () => {
  const pageRef = useRef<HTMLElement | null>(null);
  usePointerParallax(pageRef);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) document.documentElement.style.setProperty('scroll-behavior', 'auto');
  }, []);

  return (
    <main ref={pageRef} className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 min-h-screen text-white overflow-x-hidden">
      {/* background depth */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 10% 15%, rgba(59,130,246,0.08), transparent 10%), radial-gradient(ellipse at 90% 85%, rgba(168,85,247,0.06), transparent 8%)',
        }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-5 bg-[repeating-linear-gradient(0deg,#0000_0px,#0000_1px,rgba(255,255,255,0.01)_1px,rgba(255,255,255,0.00)_4px)]" />

      <Hero />
      <Timeline />
      <ArchitectureStrip />

      {/* Multi-step Reasoning micro-grid with tool tie-ins */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Multi‑step Reasoning — SecOps Orchestration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Plan',
                desc: 'Decompose incidents into subgoals, pick enrichment targets, and select tools.',
                hint: 'Example: Identify impacted assets → propose containment path → approval check',
              },
              {
                title: 'Execute',
                desc: 'Invoke MCP/function tools to query SIEM, isolate hosts, revoke tokens, and open tickets.',
                hint: 'Example: KQL/Sigma → isolate endpoint → rotate keys → attach evidence',
              },
              {
                title: 'Verify & Judge',
                desc: 'LLM‑as‑judge validates results against policy/graph constraints; failures trigger replans.',
                hint: 'Example: Reject non‑approved action → reroute with approved playbook',
              },
            ].map((b) => (
              <motion.div
                key={b.title}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="rounded-xl p-6 bg-slate-900/30 border border-slate-700/40 backdrop-blur-md"
              >
                <h4 className="font-semibold text-white mb-2">{b.title}</h4>
                <p className="text-slate-300 text-sm">{b.desc}</p>
                <div className="mt-4 text-xs text-slate-400">{b.hint}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <FineTuneLane />
      <Conclusion />

      <footer className="py-12 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} · Security Infographic — Visual infographic
      </footer>
    </main>
  );
};

export default SecurityInfographic;
