
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  const cardStyles = `
    relative overflow-hidden rounded-2xl
    bg-[rgba(79,70,229,0.08)] 
    border border-[rgba(79,70,229,0.3)] 
    backdrop-blur-xl
    shadow-lg shadow-purple-500/10
  `;
  return <div className={`${cardStyles} ${className}`}>{children}</div>;
};

export default GlassCard;