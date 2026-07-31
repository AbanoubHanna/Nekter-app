import React, { useMemo } from "react";

const COLORS = ["var(--teal)", "var(--amber)", "var(--berry)", "#FFFFFF"];

/**
 * A small celebratory confetti burst, positioned via the parent (relative).
 * Purely decorative — respects prefers-reduced-motion via theme.css.
 */
const ConfettiBurst = ({ count = 14 }) => {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 50 + Math.random() * 40;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 20,
      r: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.15,
    };
  }), [count]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {pieces.map(p => (
        <span
          key={p.id}
          className="n-confetti-piece"
          style={{
            '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`,
            background: p.color, borderRadius: p.id % 2 === 0 ? '2px' : '50%',
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default ConfettiBurst;
