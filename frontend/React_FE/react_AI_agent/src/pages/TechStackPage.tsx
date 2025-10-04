import React, { useState, useRef, useEffect, type MouseEvent, type TouchEvent } from 'react';
import { Cpu, Network, Database, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

// Updated Tech Cards
const cardData = [
  {
    id: 1,
    category: 'Core Backend',
    title: 'Python + FastAPI Engine',
    description:
      'Our backend is powered by Python and FastAPI, designed for high-performance async APIs, scalable microservices, and seamless model integration.',
    features: ['Async APIs', 'High scalability'],
    buttonText: 'Explore Backend Architecture',
    icon: <Cpu className="w-5 h-5 text-blue-400" />,
    color: 'blue',
  },
  {
    id: 2,
    category: 'AI + LLM Systems',
    title: 'LLM Reasoning Framework',
    description:
      'Built around large language models with prompt-tuning and self-judging capabilities. Supports reasoning chains, multi-agent workflows, and contextual understanding.',
    features: ['Prompt tuning', 'LLM-as-a-judge'],
    buttonText: 'View AI Framework',
    icon: <Network className="w-5 h-5 text-purple-400" />,
    color: 'purple',
  },
  {
    id: 3,
    category: 'Data & MLOps',
    title: 'MLflow + RAG Pipelines',
    description:
      'End-to-end tracking and deployment of models using MLflow. Enhanced with multi-step RAG pipelines for retrieval-augmented generation and intelligent knowledge synthesis.',
    features: ['Multi-step RAG', 'MLflow tracking'],
    buttonText: 'See Data Infrastructure',
    icon: <Database className="w-5 h-5 text-emerald-400" />,
    color: 'emerald',
  },
  {
    id: 4,
    category: 'Security & Infrastructure',
    title: 'Guardrails + Postgres + Open Source',
    description:
      'Security-first design with AI guardrails, Postgres for reliable storage, and open-source foundations that ensure transparency and extensibility.',
    features: ['AI guardrails', 'Postgres DB'],
    buttonText: 'Explore Secure Stack',
    icon: <Shield className="w-5 h-5 text-amber-400" />,
    color: 'amber',
  },
];

// Card Component
const TechCard = ({
  data,
  onDragStart,
}: {
  data: typeof cardData[0];
  onDragStart: (e: MouseEvent | TouchEvent, id: number) => void;
}) => {
  const { id, category, title, description, features, buttonText, icon, color } = data;
  return (
    <article
      className={`relative h-96 rounded-2xl bg-gradient-to-br from-slate-800/90 border shadow-2xl backdrop-blur-md
        to-${color}-900/30 border-${color}-500/20
      `}
      onMouseDown={(e) => onDragStart(e, id)}
      onTouchStart={(e) => onDragStart(e, id)}
    >
      <div className="h-full flex flex-col p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-full bg-${color}-500/20 border border-${color}-500/30`}>{icon}</div>
          <span className={`text-xs uppercase tracking-wide text-${color}-400 font-medium`}>{category}</span>
        </div>
        <h3 className="text-2xl font-semibold mb-4">{title}</h3>
        <p className="text-slate-300 mb-6 flex-1">{description}</p>
        <div className="flex items-center gap-4 text-sm mb-6">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <div className={`w-2 h-2 bg-${color}-400 rounded-full`}></div>
              <span className="text-slate-400">{feature}</span>
            </div>
          ))}
        </div>
        <button
          className={`w-full py-3 px-4 bg-${color}-500/10 border border-${color}-500/30 rounded-lg text-${color}-400 hover:bg-${color}-500/20 transition-colors`}
        >
          {buttonText}
        </button>
      </div>
    </article>
  );
};

const TechStackPage = () => {
  const [activeCardId, setActiveCardId] = useState(1);
  const containerRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  const navigateToCard = (id: number) => {
    setActiveCardId(id);
  };

  const nextCard = () => setActiveCardId(activeCardId === cardData.length ? 1 : activeCardId + 1);
  const prevCard = () => setActiveCardId(activeCardId === 1 ? cardData.length : activeCardId - 1);

  const handleDragStart = (e: MouseEvent | TouchEvent, cardId: number) => {
    if (cardId !== activeCardId) return;

    isDragging.current = true;
    startX.current = 'touches' in e ? e.touches[0].clientX : e.clientX;

    const dragMove = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (!isDragging.current) return;
      const currentX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const diff = currentX - startX.current;

      if (containerRef.current) {
        const article = containerRef.current.querySelector(`article:nth-of-type(${cardId})`);
        if (article) {
          if (diff > 10) {
            article.classList.add('dragging-right');
            article.classList.remove('dragging-left');
          } else if (diff < -10) {
            article.classList.add('dragging-left');
            article.classList.remove('dragging-right');
          } else {
            article.classList.remove('dragging-left', 'dragging-right');
          }
        }
      }
    };

    const dragEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const article = containerRef.current?.querySelector(`article:nth-of-type(${cardId})`);
      if (article?.classList.contains('dragging-right')) {
        prevCard();
      } else if (article?.classList.contains('dragging-left')) {
        nextCard();
      }

      article?.classList.remove('dragging-left', 'dragging-right');
      document.removeEventListener('mousemove', dragMove as any);
      document.removeEventListener('touchmove', dragMove as any);
      document.removeEventListener('mouseup', dragEnd);
      document.removeEventListener('touchend', dragEnd);
    };

    document.addEventListener('mousemove', dragMove as any);
    document.addEventListener('touchmove', dragMove as any, { passive: false });
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const preventDefault = (e: globalThis.TouchEvent) => e.preventDefault();
      container.addEventListener('touchstart', preventDefault, { passive: false });
      return () => container.removeEventListener('touchstart', preventDefault);
    }
  }, []);

  return (
    <div className="relative min-h-screen antialiased flex flex-col items-center justify-center text-white font-sans bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-800 p-8 overflow-hidden">
      <div className="text-center mb-24">
        <div className="flex items-center justify-center gap-2 text-blue-400 mb-4">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium uppercase tracking-wide">AI Systems Framework</span>
        </div>
        <h1 className="text-4xl font-semibold mb-3">Intelligent Tech Stack</h1>
        <p className="text-slate-400 max-w-md">Drag or use arrows to explore our AI-driven product infrastructure</p>
      </div>

      {/* Card Section */}
      <section ref={containerRef} className={`card-stack card-${activeCardId}-active`}>
        {cardData.map((card) => (
          <TechCard key={card.id} data={card} onDragStart={handleDragStart} />
        ))}
      </section>

      {/* 3D Glass Arrows */}
      <button
        onClick={prevCard}
        className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 border border-white/20 backdrop-blur-lg p-4 rounded-full shadow-lg hover:scale-110 hover:shadow-blue-400/50 transition-all duration-300 group"
      >
        <ChevronLeft className="w-6 h-6 text-blue-300 group-hover:text-blue-400 animate-pulse" />
      </button>
      <button
        onClick={nextCard}
        className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 border border-white/20 backdrop-blur-lg p-4 rounded-full shadow-lg hover:scale-110 hover:shadow-blue-400/50 transition-all duration-300 group"
      >
        <ChevronRight className="w-6 h-6 text-blue-300 group-hover:text-blue-400 animate-pulse" />
      </button>

      {/* Dots */}
      <div className="flex gap-2 mt-12">
        {cardData.map((card) => (
          <button
            key={card.id}
            onClick={() => navigateToCard(card.id)}
            className={`w-3 h-3 rounded-full transition-all ${
              activeCardId === card.id ? 'bg-blue-500 scale-125' : 'bg-slate-600 hover:bg-blue-400'
            }`}
          ></button>
        ))}
      </div>
    </div>
  );
};

export default TechStackPage;
