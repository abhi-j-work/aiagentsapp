import React from "react";
import { motion, useViewportScroll, useTransform } from "framer-motion";

const layers = [
  "Only an LLM call?",
  "Trained Custom Model on Domain Data",
  "Utilizing RAG and Vector DB to create intelligence for all your specific business domain documents",
  "Utilizing GraphRAG to provide a HybridRAG for effective retrieval",
  "Use multiple tools like MCP",
  "Do Multi-step Reasoning by combining all these tools, domain knowledge and domain intelligence then providing to the LLM",
  "Accomplish domain specific user/human defined tasks which no general LLM call can accomplish",
  "AI AGENT - tailored to your specific domain needs",
];

const ScrollCircleAnimation = () => {
  const { scrollYProgress } = useViewportScroll();

  // Create an array of transforms for each layer's opacity and scale
  const layerAnimations = layers.map((_, i) => {
    const start = i / layers.length;
    const end = (i + 1) / layers.length;

    const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
    const scale = useTransform(scrollYProgress, [0, 1], [1 - i * 0.07, 1 - i * 0.07 + 0.5]);
    const fontSize = useTransform(scrollYProgress, [0, 1], [20, 20 - i * 1.5 + 12]);

    return { opacity, scale, fontSize };
  });

  return (
    <div style={{ height: "300vh", background: "#0f172a", position: "relative" }}>
      <motion.div
        style={{
          position: "sticky",
          top: "50%",
          left: "50%",
          width: 400,
          height: 400,
          transform: "translate(-50%, -50%)",
        }}
      >
        {layers.map((text, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 300 + i * 40,
              height: 300 + i * 40,
              borderRadius: "50%",
              border: "2px solid white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: 20,
              scale: layerAnimations[i].scale,
              opacity: layerAnimations[i].opacity,
            }}
          >
            <motion.span
              style={{
                color: "white",
                fontSize: layerAnimations[i].fontSize,
                fontWeight: i === 0 ? "bold" : "500",
              }}
            >
              {text}
            </motion.span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default ScrollCircleAnimation;
