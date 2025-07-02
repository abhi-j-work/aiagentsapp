import React, { useState, useRef, useEffect, type MouseEvent, type TouchEvent } from 'react';
import { Leaf, Zap, Recycle, TrendingUp } from 'lucide-react';

// Card Data - Storing card info in an array makes it easy to map over.
const cardData = [
  {
    id: 1,
    category: 'Carbon Analytics',
    title: 'Smart Carbon Tracking',
    description: "Real-time monitoring of your organization's carbon footprint with AI-powered insights. Track emissions across all operations and achieve net-zero goals.",
    features: ['98% accuracy', 'Real-time data'],
    buttonText: 'Reduce emissions by 40%',
    icon: <Leaf className="w-5 h-5 text-green-400" />,
    color: 'green',
  },
  {
    id: 2,
    category: 'Energy Management',
    title: 'Intelligent Power Control',
    description: 'AI-driven energy optimization that automatically adjusts power consumption based on usage patterns, weather, and grid demand.',
    features: ['24/7 monitoring', 'Auto-optimization'],
    buttonText: 'Save up to 35% on energy',
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    color: 'blue',
  },
  {
    id: 3,
    category: 'Waste Reduction',
    title: 'Circular Economy Hub',
    description: 'Transform waste streams into valuable resources. Connect with suppliers, track materials, and create sustainable supply chains.',
    features: ['Zero waste goal', 'Material tracking'],
    buttonText: 'Achieve 90% waste diversion',
    icon: <Recycle className="w-5 h-5 text-purple-400" />,
    color: 'purple',
  },
  {
    id: 4,
    category: 'ESG Reporting',
    title: 'Sustainability Dashboard',
    description: 'Comprehensive ESG reporting tools that automatically generate sustainability reports and ensure regulatory compliance.',
    features: ['Automated reports', 'Compliance ready'],
    buttonText: 'Streamline ESG compliance',
    icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
    color: 'amber',
  },
];

// Reusable Card Component
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
        <button className={`w-full py-3 px-4 bg-${color}-500/10 border border-${color}-500/30 rounded-lg text-${color}-400 hover:bg-${color}-500/20 transition-colors`}>
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
            navigateToCard(activeCardId === 1 ? 4 : activeCardId - 1);
        } else if (article?.classList.contains('dragging-left')) {
            navigateToCard(activeCardId === 4 ? 1 : activeCardId + 1);
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

  // Add a listener to prevent default touch behavior for better dragging on mobile
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const preventDefault = (e: globalThis.TouchEvent) => e.preventDefault();
      container.addEventListener('touchstart', preventDefault, { passive: false });
      return () => container.removeEventListener('touchstart', preventDefault);
    }
  }, []);

  return (
    <div className="min-h-screen antialiased flex flex-col items-center justify-center text-white font-sans bg-gradient-to-br from-slate-900 via-green-900/20 to-slate-800 p-8">
      <div className="text-center mb-24">
        <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium uppercase tracking-wide">EcoFlow Solutions</span>
        </div>
        <h1 className="text-4xl font-semibold mb-3">Green Technology Stack</h1>
        <p className="text-slate-400 max-w-md">Drag cards to explore our sustainable technology solutions</p>
      </div>

      <section ref={containerRef} className={`card-stack card-${activeCardId}-active`}>
        {cardData.map((card) => (
          <TechCard key={card.id} data={card} onDragStart={handleDragStart} />
        ))}
      </section>

      <div className="flex gap-2 mt-8">
        {cardData.map((card) => (
          <button
            key={card.id}
            onClick={() => navigateToCard(card.id)}
            className={`w-3 h-3 rounded-full transition-all ${
              activeCardId === card.id ? 'bg-green-500 scale-125' : 'bg-slate-600 hover:bg-green-400'
            }`}
          ></button>
        ))}
      </div>
    </div>
  );
};

export default TechStackPage;