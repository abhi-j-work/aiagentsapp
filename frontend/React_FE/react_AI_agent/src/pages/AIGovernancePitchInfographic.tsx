import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { 
    // Icons from the Architecture Diagram
    ShieldCheck, Clock, TrendingUp, AlertTriangle, 
    Database, Cpu, Bot, User, Layers, Eye, FileJson, CheckSquare,
    NotebookText,
    // Icons from the KPI/Capabilities sections
    KeyRound,
} from 'lucide-react';

// ===================================================
// Reusable Sub-Components (Combined from both files)
// ===================================================

const KpiCard = ({ icon, title, value, description, color, delay, transform }: { icon: React.ReactNode, title: string, value: string, description: string, color: string, delay: string, transform?: string }) => (
    <div className={`p-6 bg-slate-800/40 backdrop-blur-sm rounded-lg border border-slate-700/50 shadow-lg animate-fade-in-up text-center`} style={{ animationDelay: delay }}>
        <div className="flex justify-center items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-md bg-${color}-500/10 flex items-center justify-center`}>
                {React.cloneElement(icon as React.ReactElement, { style: { transform } })}
            </div>
            <p className={`text-4xl md:text-5xl font-black text-white`}>{value}</p>
        </div>
        <h3 className="text-lg font-bold text-slate-200">{title}</h3>
        <p className="mt-2 text-slate-400 text-sm">{description}</p>
    </div>
);

const WorkflowStep = ({ number, title, description, color, delay }: { number: string, title: string, description: string, color: string, delay: string }) => (
    <div className="flex flex-col items-center text-center w-full md:w-1/5 animate-fade-in-up" style={{ animationDelay: delay }}>
        <div className={`relative z-10 bg-${color}-600 text-white rounded-full w-20 h-20 flex items-center justify-center text-3xl font-black shadow-lg border-4 border-slate-900`}>{number}</div>
        <h3 className="font-bold mt-4 text-lg text-white">{title}</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>
    </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 bg-slate-800/40 backdrop-blur-sm rounded-lg border border-slate-700/50 shadow-lg ${className}`}>
        {children}
    </div>
);


// ===================================================
// NEWLY INTEGRATED: The MCP-Driven Architecture Diagram
// ===================================================
const ArchitectureDiagram = () => {
    // Refs and state for the responsive SVG path
    const containerRef = useRef<HTMLDivElement>(null);
    const [feedbackPathD, setFeedbackPathD] = useState('');

    useEffect(() => {
        const updatePath = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                
                // Calculate absolute coordinates based on container dimensions
                const startX = width * 0.5;
                const startY = height;
                const control1X = 0;
                const control1Y = height;
                const control2X = 0;
                const control2Y = height * 0.4;
                const endX = width * 0.5;
                const endY = height * 0.4;

                // Create the new 'd' attribute string with absolute numbers
                const newPathD = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
                setFeedbackPathD(newPathD);
            }
        };

        // Update the path initially and on window resize
        updatePath();
        window.addEventListener('resize', updatePath);

        // Cleanup the event listener when the component unmounts
        return () => window.removeEventListener('resize', updatePath);
    }, []); // Empty dependency array ensures this runs once on mount

    // Sub-components for the diagram (ArchBox, ArchPill, FlowArrow) remain unchanged
    const ArchBox = ({ title, icon: Icon, color, children, delay }: {title: string, icon: React.ElementType, color: string, children: React.ReactNode, delay: string}) => (
        <div className={`relative bg-slate-900/70 border border-${color}-500/30 rounded-lg p-4 text-center animate-fade-in-up transition-all duration-300 hover:shadow-xl hover:shadow-${color}-500/10 hover:-translate-y-1`} style={{ animationDelay: delay }}>
            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 font-bold text-xs text-${color}-300 bg-slate-800 px-3 py-1 rounded-full border border-${color}-500/30`}><Icon className="w-4 h-4" /> {title}</div>
            <div className="flex flex-wrap justify-center gap-2 pt-5">{children}</div>
        </div>
    );
    const ArchPill = ({ label }: {label: string}) => (<div className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md">{label}</div>);
    const FlowArrow = ({ delay, vertical = false }: {delay: string, vertical?: boolean}) => (
        <div className={`relative ${vertical ? 'h-16 w-full lg:w-8' : 'h-8 w-full'} flex items-center justify-center animate-fade-in-up`} style={{ animationDelay: delay }}>
            <div className={`${vertical ? 'h-full w-px' : 'w-full h-px'} bg-slate-600`}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-400" style={{ animation: `flow-${vertical ? 'v' : 'h'} 3s ease-in-out infinite ${delay}` }}></div>
        </div>
    );

    return (
        <Card className="p-8 md:p-12">
            <style>{`
                /* CSS Animations remain the same */
                @keyframes flow-h { 0% { transform: translateX(-50px) scale(0.8); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateX(50px) scale(1); opacity: 0; } }
                @keyframes flow-v { 0% { transform: translateY(-30px) scale(0.8); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(30px) scale(1); opacity: 0; } }
                @keyframes feedback-flow { 0% { motion-offset: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { motion-offset: 100%; opacity: 0; } }
                @keyframes line-draw { to { stroke-dashoffset: 0; } }
            `}</style>
            {/* The ref is attached to the main container that the SVG will overlay */}
            <div ref={containerRef} className="relative grid grid-cols-1 gap-y-4">
                
                {/* Layer 1 & 2: Users & Control Plane */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
                    <ArchBox title="Presentation Layer" icon={User} color="blue" delay="100ms"><ArchPill label="Data Steward" /><ArchPill label="Business User" /></ArchBox>
                    <FlowArrow delay="200ms" />
                    <ArchBox title="Control Plane (API)" icon={Cpu} color="purple" delay="300ms"><ArchPill label="FastAPI Orchestrator" /></ArchBox>
                </div>
                <FlowArrow delay="400ms" vertical />

                {/* Layer 3: Model Context Protocol (MCP) Hub */}
                <div className="flex justify-center">
                     <div className="p-4 border-2 border-dashed border-slate-700 rounded-xl w-full max-w-4xl">
                        <h4 className="font-bold text-center text-slate-400 mb-4 text-sm uppercase tracking-wider">Model Context Protocol (MCP) Hub</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <ArchBox title="Prompt Engineering" icon={FileJson} color="cyan" delay="500ms"><ArchPill label="Prompt Templates" /><ArchPill label="Version Control" /></ArchBox>
                             <ArchBox title="Context Assembly" icon={Layers} color="cyan" delay="600ms"><ArchPill label="Inject Schema" /><ArchPill label="Add Data" /></ArchBox>
                             <ArchBox title="Validation & Security" icon={CheckSquare} color="cyan" delay="700ms"><ArchPill label="Output Schema" /><ArchPill label="Guardrails" /></ArchBox>
                        </div>
                    </div>
                </div>
                <FlowArrow delay="800ms" vertical />

                {/* Layer 4: Intelligence & Data */}
                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 items-start">
                     <div className="flex flex-col items-center gap-4 text-center">
                        <h4 className="font-bold text-slate-300 text-sm uppercase tracking-wider">Intelligence Core</h4>
                        <ArchBox title="AI / ML Services" icon={Bot} color="teal" delay="900ms"><ArchPill label="Classifier LLM" /><ArchPill label="SQL-Gen LLM" /><ArchPill label="Fine-Tuning" /></ArchBox>
                    </div>
                    <div className="flex flex-col items-center gap-4 text-center">
                         <h4 className="font-bold text-slate-300 text-sm uppercase tracking-wider">Data & Storage</h4>
                         <ArchBox title="Data Plane" icon={Database} color="blue" delay="1000ms"><ArchPill label="PostgreSQL" /><ArchPill label="Snowflake" /></ArchBox>
                         <ArchBox title="Stateful Stores" icon={NotebookText} color="amber" delay="1100ms"><ArchPill label="Metadata DB" /></ArchBox>
                    </div>
                </div>
                <FlowArrow delay="1200ms" vertical />
                
                {/* Layer 5: Governed Output */}
                 <div className="flex justify-center">
                     <ArchBox title="Governed Data Layer" icon={Eye} color="rose" delay="1300ms">
                        <ArchPill label="Secure Masked Views" />
                        <ArchPill label="Auditable Access Logs" />
                    </ArchBox>
                </div>
                
                {/* Feedback Loop Arrow - NOW DYNAMIC */}
                <svg className="absolute top-0 left-0 w-full h-full -z-10" style={{pointerEvents:'none'}}>
                    <path 
                        id="feedback-path" 
                        d={feedbackPathD}  // Use the state variable
                        fill="none" 
                        stroke="#f59e0b" 
                        strokeWidth="2.5" 
                        strokeDasharray="6 6" 
                        style={{ strokeDashoffset: '1000', animation: 'line-draw 2s ease-out 2.5s forwards' }}
                    />
                    <circle 
                        r="5" 
                        fill="#f59e0b" 
                        // Use the state variable for the offset-path as well
                        style={{
                            offsetPath: `path("${feedbackPathD}")`, 
                            animation: 'feedback-flow 6s ease-in-out infinite 3s'
                        }}
                    />
                </svg>
            </div>
        </Card>
    );
}

// ===================================================
// The Main Infographic Page Component
// ===================================================
const AIGovernanceInfographic = () => {
    // Refs for Chart.js canvases
    const classificationChartRef = useRef<HTMLCanvasElement | null>(null);
    const qualityChartRef = useRef<HTMLCanvasElement | null>(null);
    const efficiencyChartRef = useRef<HTMLCanvasElement | null>(null);
    const securityChartRef = useRef<HTMLCanvasElement | null>(null);

    // useEffect hook to initialize charts on component mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const chartInstances: Chart[] = [];
        const chartColors = {
            purple: '#a855f7', teal: '#14b8a6', rose: '#f43f5e',
            amber: '#f59e0b', cyan: '#06b6d4', blue: '#3b82f6',
            text: '#e2e8f0', // slate-200
            grid: 'rgba(255, 255, 255, 0.1)'
        };

        const defaultChartOptions: any = {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: chartColors.text, font: { size: 12, family: 'Inter' }}},
                tooltip: { 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: 'white', bodyColor: 'white',
                    titleFont: { size: 14, family: 'Inter', weight: 'bold' }, bodyFont: { size: 12, family: 'Inter' }, 
                    padding: 10, cornerRadius: 4,
                    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: chartColors.grid } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        };

        if (classificationChartRef.current) {
            const chart = new Chart(classificationChartRef.current, {
                type: 'doughnut',
                data: {
                    labels: ['Non-Sensitive', 'PII', 'Sensitive', 'Internal/Confidential'],
                    datasets: [{ data: [250, 45, 15, 80], backgroundColor: [chartColors.blue, chartColors.rose, chartColors.amber, chartColors.cyan], borderColor: '#1e293b', borderWidth: 4 }]
                },
                options: { ...defaultChartOptions, scales: undefined, cutout: '60%' }
            });
            chartInstances.push(chart);
        }
        if (qualityChartRef.current) {
            const chart = new Chart(qualityChartRef.current, {
                type: 'bar',
                data: { labels: ['Emails', 'Phones', 'Dates'], datasets: [{ label: 'Valid', data: [9850, 9700, 9950], backgroundColor: chartColors.purple, borderRadius: 4 }, { label: 'Invalid (AI Found)', data: [150, 300, 50], backgroundColor: chartColors.rose, borderRadius: 4 }] },
                options: { ...defaultChartOptions, scales: { x: { ...defaultChartOptions.scales.x, stacked: true }, y: { ...defaultChartOptions.scales.y, stacked: true } } }
            });
            chartInstances.push(chart);
        }
        if (efficiencyChartRef.current) {
            const chart = new Chart(efficiencyChartRef.current, {
                type: 'bar',
                data: { labels: ['Manual Process', 'AI Agent'], datasets: [{ label: 'Time (Hours)', data: [80, 2], backgroundColor: [chartColors.rose, chartColors.teal], barThickness: 40 }] },
                options: { ...defaultChartOptions, indexAxis: 'y', plugins: { ...defaultChartOptions.plugins, legend: { display: false } } }
            });
            chartInstances.push(chart);
        }
        if (securityChartRef.current) {
            const chart = new Chart(securityChartRef.current, {
                type: 'pie',
                data: { labels: ['Human Error Risk', 'AI Automated Coverage'], datasets: [{ data: [15, 85], backgroundColor: [chartColors.amber, chartColors.purple], borderColor: '#1e293b', borderWidth: 4 }] },
                options: { ...defaultChartOptions, scales: undefined, cutout: '0%' }
            });
            chartInstances.push(chart);
        }

        return () => chartInstances.forEach(chart => chart.destroy());
    }, []);

    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans">
            <div className="container mx-auto p-4 md:p-8 max-w-7xl">
                
                <header className="text-center py-16 animate-fade-in-up">
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">Automate Data Governance with AI</h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">An intelligent agent that transforms complex, manual data management into a secure, efficient, and automated workflow.</p>
                </header>

                <section id="challenge" className="my-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <KpiCard icon={<AlertTriangle className="w-6 h-6 text-rose-400"/>} title="Manual Classification Risk" value="85%" description="of data breaches are caused by human error, making manual PII handling a significant liability." color="rose" delay="100ms" />
                        <KpiCard icon={<Clock className="w-6 h-6 text-amber-400"/>} title="Compliance Overhead" value="40+" description="hours per week spent by data teams on manual compliance checks and reporting." color="amber" delay="200ms" />
                        <KpiCard icon={<TrendingUp className="w-6 h-6 text-teal-400"/>} title="Time-to-Data Reduction" value="90%" description="less time for non-technical users to get insights, from days to minutes via NL-to-SQL." color="teal" delay="300ms" transform="scale(1, -1)" />
                    </div>
                </section>

                <section id="workflow" className="my-24">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">The Automated Governance Workflow</h2>
                    <div className="relative flex flex-col md:flex-row justify-between items-start space-y-12 md:space-y-0">
                        <div className="absolute top-10 left-0 w-full h-1 bg-slate-700 -z-10 hidden md:block">
                            <div className="h-1 bg-gradient-to-r from-purple-500 to-teal-500" style={{width: '100%', animation: 'line-draw 2s ease-out forwards'}}></div>
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
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><KeyRound className="text-rose-400"/>AI-Powered PII Classification</h3>
                            <p className="text-slate-400 mb-4 flex-grow">The agent uses an LLM to scan schemas and intelligently tag columns with high accuracy.</p>
                            <div className="h-64 md:h-80"><canvas ref={classificationChartRef}></canvas></div>
                        </Card>
                        <Card className="flex flex-col">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><ShieldCheck className="text-amber-400"/>Automated Data Quality Checks</h3>
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