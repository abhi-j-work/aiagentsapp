import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import {
  ShieldCheck,
  Clock,
  TrendingUp,
  AlertTriangle,
  Database,
  Cpu,
  Bot,
  User,
  Layers,
  Eye,
  FileJson,
  CheckSquare,
  NotebookText,
  KeyRound,
} from 'lucide-react';

/* =========================
   Small helper: useTilt hook
   Adds a gentle 3D tilt on mouse move.
   Works only when pointer is available; returns a ref you attach to the element.
   ========================= */
function useTilt(active = true) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateX = (py - 0.5) * 9; // smaller angle for subtlety
      const rotateY = (px - 0.5) * -9;
      const translateZ = 12;
      el.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px)`;
      // update light reflection (CSS var)
      el.style.setProperty('--tilt-x', `${rotateY}deg`);
      el.style.setProperty('--tilt-y', `${rotateX}deg`);
    };
    const handleLeave = () => {
      el.style.transform = `perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0px)`;
      el.style.setProperty('--tilt-x', `0deg`);
      el.style.setProperty('--tilt-y', `0deg`);
    };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    el.addEventListener('touchmove', handleLeave); // disable on touch to avoid weird transforms
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      el.removeEventListener('touchmove', handleLeave);
    };
  }, [active]);

  return ref;
}

/* =========================
   Reusable subcomponents
   Enhanced with glass + glow + tilt
   ========================= */

const KpiCard = ({
  icon,
  title,
  value,
  description,
  color,
  delay,
  transform,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  color: string;
  delay: string;
  transform?: string;
}) => {
  const tiltRef = useTilt(true);
  return (
    <div
      ref={tiltRef}
      className={`relative p-6 rounded-lg border transition-transform duration-300 will-change-transform bg-gradient-to-br from-white/3 to-white/2 backdrop-blur-xl border-white/6 shadow-2xl`}
      style={{
        animation: `fadeInUp .6s cubic-bezier(.2,.9,.3,1) ${delay} both`,
      }}
    >
      <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
        {/* glass shine */}
        <div
          className="absolute -left-20 -top-40 w-44 h-44 opacity-10 transform rotate-45 filter blur-3xl"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 30%, transparent 60%)',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${color}-500/10 border border-${color}-500/20`}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { style: { transform } }) : icon}
        </div>
        <div>
          <p className="text-4xl md:text-5xl font-black leading-none text-white">{value}</p>
          <p className="text-xs text-slate-400 tracking-wide uppercase mt-1">{title}</p>
        </div>
      </div>

      <p className="text-slate-300 text-sm">{description}</p>

      <div
        className={`absolute -inset-px rounded-lg border-2 pointer-events-none opacity-0 transition-opacity duration-500`}
        style={{
          borderImage:
            'linear-gradient(120deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01)) 1 / 1 / 0 stretch',
        }}
      />
    </div>
  );
};

const WorkflowStep = ({ number, title, description, color, delay }: { number: string; title: string; description: string; color: string; delay: string }) => {
  const tiltRef = useTilt(true);
  return (
    <div
      ref={tiltRef}
      className="flex flex-col items-center text-center w-full md:w-1/5"
      style={{ animation: `fadeInUp .6s cubic-bezier(.2,.9,.3,1) ${delay} both` }}
    >
      <div
        className={`relative z-10 rounded-full w-20 h-20 flex items-center justify-center text-3xl font-black shadow-xl border-4`}
        style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`, borderColor: 'rgba(255,255,255,0.04)' }}
      >
        <div className={`w-full h-full rounded-full flex items-center justify-center bg-${color}-600/60 text-white`}>{number}</div>
      </div>
      <h3 className="font-bold mt-4 text-lg text-white">{title}</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>
    </div>
  );
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const tiltRef = useTilt(true);
  return (
    <div
      ref={tiltRef}
      className={`relative p-6 rounded-xl border bg-slate-800/30 backdrop-blur-md shadow-2xl border-slate-700/40 ${className}`}
      style={{ transition: 'transform .25s ease, box-shadow .25s ease' }}
    >
      {/* decorative glow behind the card */}
      <div
        className="absolute -inset-2 rounded-xl -z-10 blur-3xl opacity-30"
        style={{
          background:
            'linear-gradient(120deg, rgba(99,102,241,0.06), rgba(56,189,248,0.04) 40%, rgba(236,72,153,0.03))',
        }}
      />
      {/* subtle glass-shine */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
        }}
      />
      {children}
    </div>
  );
};

/* =========================
   ArchitectureDiagram - same structure but enhanced visuals & animations
   ========================= */

const ArchitectureDiagram = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [feedbackPathD, setFeedbackPathD] = useState('');

  useEffect(() => {
    const updatePath = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const startX = width * 0.5;
      const startY = height * 0.98;
      const control1X = width * 0.03;
      const control1Y = height * 0.95;
      const control2X = width * 0.03;
      const control2Y = height * 0.45;
      const endX = width * 0.5;
      const endY = height * 0.42;
      const newPathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${control1X.toFixed(1)} ${control1Y.toFixed(1)}, ${control2X.toFixed(1)} ${control2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      setFeedbackPathD(newPathD);
    };
    updatePath();
    window.addEventListener('resize', updatePath);
    return () => window.removeEventListener('resize', updatePath);
  }, []);

  const ArchBox = ({ title, icon: Icon, color, children, delay }: { title: string; icon: React.ElementType; color: string; children: React.ReactNode; delay: string }) => {
    const tiltRef = useTilt(true);
    return (
      <div
        ref={tiltRef}
        className={`relative bg-slate-900/60 border border-${color}-500/20 rounded-lg p-4 text-center transform transition-all duration-300 hover:shadow-2xl`}
        style={{ animation: `fadeInUp .6s cubic-bezier(.2,.9,.3,1) ${delay} both`, transformStyle: 'preserve-3d' }}
      >
        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-${color}-300 bg-slate-800/80 border border-${color}-500/20 shadow-sm`}>
          <Icon className="w-4 h-4" />
          <span className="font-semibold">{title}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-6">{children}</div>
      </div>
    );
  };

  const ArchPill = ({ label }: { label: string }) => <div className="text-xs bg-slate-800/60 text-slate-300 px-2 py-1 rounded-md">{label}</div>;

  const FlowArrow = ({ delay, vertical = false }: { delay: string; vertical?: boolean }) => (
    <div className={`relative ${vertical ? 'h-16 w-full lg:w-8' : 'h-8 w-full'} flex items-center justify-center`} style={{ animation: `fadeInUp .6s ease ${delay} both` }}>
      <div className={`${vertical ? 'h-full w-px' : 'w-full h-px'} bg-slate-600`}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-400 animate-pulse-slow" />
    </div>
  );

  return (
    <Card className="p-8 md:p-12 overflow-visible relative">
      <style>{`
        /* Animations & helpers */
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatSlow { 0% { transform: translateY(0) } 50% { transform: translateY(-10px) } 100% { transform: translateY(0) } }
        @keyframes pulseGlow { 0% { box-shadow: 0 0 0px rgba(99,102,241,0.0) } 50% { box-shadow: 0 10px 30px rgba(99,102,241,0.06) } 100% { box-shadow: 0 0 0px rgba(99,102,241,0.0) } }
        @keyframes line-draw { to { stroke-dashoffset: 0; } }
        @keyframes feedback-flow { 0% { offset-distance: 0% ; opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { offset-distance: 100%; opacity: 0 } }
        .animate-pulse-slow { animation: pulseGlow 3s ease-in-out infinite; }
      `}</style>

      <div ref={containerRef} className="relative grid grid-cols-1 gap-y-4 z-10">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
          <ArchBox title="Presentation Layer" icon={User} color="blue" delay="100ms">
            <ArchPill label="Data Steward" />
            <ArchPill label="Business User" />
          </ArchBox>
          <FlowArrow delay="200ms" />
          <ArchBox title="Control Plane (API)" icon={Cpu} color="purple" delay="300ms">
            <ArchPill label="FastAPI Orchestrator" />
          </ArchBox>
        </div>

        <FlowArrow delay="400ms" vertical />

        <div className="flex justify-center">
          <div className="p-4 border-2 border-dashed border-slate-700 rounded-xl w-full max-w-4xl bg-gradient-to-b from-slate-900/40 to-transparent">
            <h4 className="font-bold text-center text-slate-400 mb-4 text-sm uppercase tracking-wider">Model Context Protocol (MCP) Hub</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ArchBox title="Prompt Engineering" icon={FileJson} color="cyan" delay="500ms">
                <ArchPill label="Prompt Templates" />
                <ArchPill label="Version Control" />
              </ArchBox>
              <ArchBox title="Context Assembly" icon={Layers} color="cyan" delay="600ms">
                <ArchPill label="Inject Schema" />
                <ArchPill label="Add Data" />
              </ArchBox>
              <ArchBox title="Validation & Security" icon={CheckSquare} color="cyan" delay="700ms">
                <ArchPill label="Output Schema" />
                <ArchPill label="Guardrails" />
              </ArchBox>
            </div>
          </div>
        </div>

        <FlowArrow delay="800ms" vertical />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 items-start">
          <div className="flex flex-col items-center gap-4 text-center">
            <h4 className="font-bold text-slate-300 text-sm uppercase tracking-wider">Intelligence Core</h4>
            <ArchBox title="AI / ML Services" icon={Bot} color="teal" delay="900ms">
              <ArchPill label="Classifier LLM" />
              <ArchPill label="SQL-Gen LLM" />
              <ArchPill label="Fine-Tuning" />
            </ArchBox>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <h4 className="font-bold text-slate-300 text-sm uppercase tracking-wider">Data & Storage</h4>
            <ArchBox title="Data Plane" icon={Database} color="blue" delay="1000ms">
              <ArchPill label="PostgreSQL" />
              <ArchPill label="Snowflake" />
            </ArchBox>
            <ArchBox title="Stateful Stores" icon={NotebookText} color="amber" delay="1100ms">
              <ArchPill label="Metadata DB" />
            </ArchBox>
          </div>
        </div>

        <FlowArrow delay="1200ms" vertical />

        <div className="flex justify-center">
          <ArchBox title="Governed Data Layer" icon={Eye} color="rose" delay="1300ms">
            <ArchPill label="Secure Masked Views" />
            <ArchPill label="Auditable Access Logs" />
          </ArchBox>
        </div>

        {/* Feedback SVG overlay that uses computed path */}
        <svg className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none">
          <defs>
            <linearGradient id="g1" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path
            d={feedbackPathD}
            fill="none"
            stroke="url(#g1)"
            strokeWidth={2.4}
            strokeDasharray="8 6"
            style={{ strokeDashoffset: 1000, animation: 'line-draw 2s ease-out 0.5s forwards' }}
          />
          <circle
            r="6"
            fill="#f97316"
            style={{
              offsetPath: `path("${feedbackPathD}")`,
              animation: 'feedback-flow 6s linear infinite 0.5s',
              transform: 'translate(-3px, -3px)',
            }}
          />
        </svg>
      </div>
    </Card>
  );
};

/* =========================
   Main Page (AIGovernanceInfographic)
   ========================= */

const AIGovernanceInfographic = () => {
  const classificationChartRef = useRef<HTMLCanvasElement | null>(null);
  const qualityChartRef = useRef<HTMLCanvasElement | null>(null);
  const efficiencyChartRef = useRef<HTMLCanvasElement | null>(null);
  const securityChartRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const chartInstances: Chart[] = [];
    const chartColors = {
      purple: '#a855f7',
      teal: '#14b8a6',
      rose: '#f43f5e',
      amber: '#f59e0b',
      cyan: '#06b6d4',
      blue: '#3b82f6',
      text: '#e2e8f0',
      grid: 'rgba(255,255,255,0.06)',
    };

    const defaultChartOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: chartColors.text, font: { size: 12, family: 'Inter' } } },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: 'white',
          bodyColor: 'white',
          titleFont: { size: 14, family: 'Inter', weight: 'bold' },
          bodyFont: { size: 12, family: 'Inter' },
          padding: 10,
          cornerRadius: 6,
          borderColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: chartColors.grid } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
      },
    };

    if (classificationChartRef.current) {
      const ctx = classificationChartRef.current.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, chartColors.blue);
      gradient.addColorStop(1, chartColors.cyan);
      const chart = new Chart(classificationChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Non-Sensitive', 'PII', 'Sensitive', 'Internal/Confidential'],
          datasets: [
            {
              data: [250, 45, 15, 80],
              backgroundColor: [chartColors.blue, chartColors.rose, chartColors.amber, chartColors.cyan],
              borderColor: '#0f172a',
              borderWidth: 4,
            },
          ],
        },
        options: { ...defaultChartOptions, scales: undefined, cutout: '58%' },
      });
      chartInstances.push(chart);
    }

    if (qualityChartRef.current) {
      const chart = new Chart(qualityChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Emails', 'Phones', 'Dates'],
          datasets: [
            { label: 'Valid', data: [9850, 9700, 9950], backgroundColor: chartColors.purple, borderRadius: 6 },
            { label: 'Invalid (AI Found)', data: [150, 300, 50], backgroundColor: chartColors.rose, borderRadius: 6 },
          ],
        },
        options: { ...defaultChartOptions, scales: { x: { ...defaultChartOptions.scales.x, stacked: true }, y: { ...defaultChartOptions.scales.y, stacked: true } } },
      });
      chartInstances.push(chart);
    }

    if (efficiencyChartRef.current) {
      const chart = new Chart(efficiencyChartRef.current, {
        type: 'bar',
        data: { labels: ['Manual Process', 'AI Agent'], datasets: [{ label: 'Time (Hours)', data: [80, 2], backgroundColor: [chartColors.rose, chartColors.teal], barThickness: 36 }] },
        options: { ...defaultChartOptions, indexAxis: 'y', plugins: { ...defaultChartOptions.plugins, legend: { display: false } } },
      });
      chartInstances.push(chart);
    }

    if (securityChartRef.current) {
      const chart = new Chart(securityChartRef.current, {
        type: 'pie',
        data: { labels: ['Human Error Risk', 'AI Automated Coverage'], datasets: [{ data: [15, 85], backgroundColor: [chartColors.amber, chartColors.purple], borderColor: '#0f172a', borderWidth: 4 }] },
        options: { ...defaultChartOptions, scales: undefined, cutout: '0%' },
      });
      chartInstances.push(chart);
    }

    return () => chartInstances.forEach((c) => c.destroy());
  }, []);

  return (
    <div className="relative bg-slate-900 text-white min-h-screen font-sans overflow-hidden">
      {/* animated background blobs & subtle particles */}
      <div className="absolute -z-20 inset-0 overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-40 transform -translate-y-1/3"
          style={{
            width: 520,
            height: 520,
            left: '-10%',
            top: '-10%',
            background: 'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.18), transparent 30%)',
            animation: 'floatSlow 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full blur-2xl opacity-30 transform"
          style={{
            width: 420,
            height: 420,
            right: '-12%',
            bottom: '-8%',
            background: 'radial-gradient(circle at 80% 80%, rgba(236,72,153,0.12), transparent 30%)',
            animation: 'floatSlow 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.015), transparent 30%)' }}
        />
      </div>

      <style>{`
        /* global small animations */
        @keyframes floatSlow { 0% { transform: translateY(0px) } 50% { transform: translateY(-14px) } 100% { transform: translateY(0px) } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div className="container mx-auto p-4 md:p-8 max-w-7xl relative z-10">
        <header className="text-center py-16 animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">Automate Data Governance with AI</h1>
          <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">An intelligent agent that transforms complex, manual data management into a secure, efficient, and automated workflow.</p>
        </header>

        <section id="challenge" className="my-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <KpiCard icon={<AlertTriangle className="w-6 h-6 text-rose-400" />} title="Manual Classification Risk" value="85%" description="of data breaches are caused by human error, making manual PII handling a significant liability." color="rose" delay="100ms" />
            <KpiCard icon={<Clock className="w-6 h-6 text-amber-400" />} title="Compliance Overhead" value="40+" description="hours per week spent by data teams on manual compliance checks and reporting." color="amber" delay="200ms" />
            <KpiCard icon={<TrendingUp className="w-6 h-6 text-teal-400" />} title="Time-to-Data Reduction" value="90%" description="less time for non-technical users to get insights, from days to minutes via NL-to-SQL." color="teal" delay="300ms" transform="scale(1, -1)" />
          </div>
        </section>

        <section id="workflow" className="my-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">The Automated Governance Workflow</h2>
          <div className="relative flex flex-col md:flex-row justify-between items-start space-y-12 md:space-y-0">
            <div className="absolute top-10 left-0 w-full h-1 bg-slate-700 -z-10 hidden md:block">
              <div className="h-1 bg-gradient-to-r from-purple-500 to-teal-500" style={{ width: '100%', animation: 'line-draw 2s ease-out forwards' }} />
            </div>
            <WorkflowStep number="1" title="Extract & Profile" description="Connects to the database, extracts schema, and profiles data statistics." color="purple" delay="100ms" />
            <WorkflowStep number="2" title="Classify Columns" description="LLM analyzes schema and content to intelligently classify columns (PII, Sensitive, etc)." color="rose" delay="300ms" />
            <WorkflowStep number="3" title="Generate Policy" description="Generates data masking policies and fine-grained access rules as SQL code." color="amber" delay="500ms" />
            <WorkflowStep number="4" title="AI Review & Refine" description="An AI peer-review checks the generated policy for errors and optimal performance." color="cyan" delay="700ms" />
            <WorkflowStep number="5" title="Apply & Monitor" description="Safely applies the governed views and continuously monitors for schema drift." color="teal" delay="900ms" />
          </div>
        </section>

        <section id="architecture" className="my-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">Our Solution: An MCP-Driven AI Ecosystem</h2>
          <ArchitectureDiagram />
        </section>

        <section id="capabilities" className="my-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">Core Capabilities Deep Dive</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><KeyRound className="text-rose-400" />AI-Powered PII Classification</h3>
              <p className="text-slate-400 mb-4 flex-grow">The agent uses an LLM to scan schemas and intelligently tag columns with high accuracy.</p>
              <div className="h-64 md:h-80"><canvas ref={classificationChartRef}></canvas></div>
            </Card>
            <Card className="flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><ShieldCheck className="text-amber-400" />Automated Data Quality Checks</h3>
              <p className="text-slate-400 mb-4 flex-grow">Leverages an LLM to find semantically invalid data, like malformed emails or addresses.</p>
              <div className="h-64 md:h-80"><canvas ref={qualityChartRef}></canvas></div>
            </Card>
            <Card className="md:col-span-2">
              <h3 className="text-xl font-bold text-center text-white mb-4">Natural Language to SQL (NL-to-SQL)</h3>
              <p className="text-slate-400 text-center mb-6 max-w-2xl mx-auto">Empower business users to query data directly using plain English, democratizing data access.</p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg w-full md:w-2/5">
                  <p className="font-semibold text-slate-300">👤 User Asks:</p>
                  <p className="mt-2 text-slate-200 italic">"Show me total sales last quarter by product category."</p>
                </div>
                <div className="text-3xl font-bold text-purple-400">→</div>
                <div className="bg-gray-950 text-white p-4 rounded-lg font-mono text-sm w-full md:w-2/5 overflow-x-auto border border-slate-700">
                  <span className="text-cyan-400">SELECT</span> <span className="text-rose-400">category</span>, <span className="text-purple-400">SUM</span>(<span className="text-rose-400">amount</span>) ...
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="benefits" className="my-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">Demonstrable Business Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4">Operational Efficiency Gains</h3>
              <p className="text-slate-400 mb-4 flex-grow">Reduce time spent on manual governance from weeks to minutes.</p>
              <div className="h-64 md:h-80"><canvas ref={efficiencyChartRef}></canvas></div>
            </Card>
            <Card className="flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4">Enhanced Data Security</h3>
              <p className="text-slate-400 mb-4 flex-grow">Automated masking and quality checks minimize risk and ensure compliance.</p>
              <div className="h-64 md:h-80"><canvas ref={securityChartRef}></canvas></div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AIGovernanceInfographic;
