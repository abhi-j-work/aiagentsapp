// AIConcentricInfographic.tsx
import React, { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import "./ConcentricRagInfographic.css";

const LABELS = [
  "Only an LLM call?",
  "Trained Custom Model on Domain Data",
  "Utilizing RAG and Vector DB to create intelligence for all your specific business domain documents",
  "Utilizing GraphRAG to provide a HybridRAG for effective retrieval",
  "Use multiple tools like MCP",
  "Do Multi-step Reasoning by combining all these tools, domain knowledge and domain intelligence then providing to the LLM",
  "Accomplish domain specific user/human defined tasks which no general LLM call can accomplish",
  "AI AGENT – tailored to your specific domain needs",
] as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type RingProps = {
  index: number;
  total: number;
  label: string;
  progress: MotionValue<number>;
};

function Ring({ index, total, label, progress }: RingProps) {
  // Each ring appears at a staggered scroll time window.
  const appearWindow = 0.12;               // width of the fade/scale-in window
  const spread = 0.9;                       // use 90% of the scroll to stagger rings
  const start = (index / (total + 1)) * spread;
  const end = 1;

  // 0->1 as the ring appears.
  const appear = useTransform(progress, (v) =>
    easeInOutCubic(clamp01((v - start) / appearWindow))
  );

  // After appearing, keep shrinking smoothly until the end.
  const shrink = useTransform(progress, (v) =>
    easeInOutCubic(clamp01((v - start) / Math.max(0.0001, end - start)))
  );

  // Ring size and shrink intensity.
  const baseVmin = 28;  // inner ring base
  const gapVmin = 11;   // inter-ring gap
  const logicalSize = baseVmin + index * gapVmin;

  // Shrink from 1 -> (1 - shrinkStrength).
  const shrinkStrength = 0.6;
  const scale = useTransform(shrink, (s) => 1 - s * shrinkStrength);
  const opacity = useTransform(appear, (a) => 0.05 + a * 0.95);

  return (
    <motion.div
      className="ring"
      style={
        {
            "--size": `${logicalSize}vmin`,
            zIndex: 1000 - index,
            opacity,
            scale,
        } as unknown as React.CSSProperties
      }
      aria-label={label}
    >
      <div className="ring-inner">
        <div className="ring-label">{label}</div>
      </div>
    </motion.div>
  );
}

function GlowBackdrop({ progress }: { progress: MotionValue<number> }) {
  // Mild parallax/glow for depth.
  const glowScale = useTransform(progress, [0, 1], [1.0, 1.08]);
  const glowY = useTransform(progress, [0, 1], [0, 30]);
  const glowOpacity = useTransform(progress, [0, 1], [0.35, 0.55]);

  return (
    <motion.div
      className="glow"
      style={{ scale: glowScale, y: glowY, opacity: glowOpacity }}
      aria-hidden
    />
  );
}

export default function ConcentricRagInfographic() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  return (
    <div className="page">
      <div className="scroll-wrapper" ref={wrapperRef}>
        <section className="stage" aria-label="AI capability evolution">
          <GlowBackdrop progress={scrollYProgress} />
          <div className="rings">
            {LABELS.map((label, i) => (
              <Ring
                key={i}
                index={i}
                total={LABELS.length}
                label={label}
                progress={scrollYProgress}
              />
            ))}
          </div>
        </section>
      </div>

     
    </div>
  );
}
