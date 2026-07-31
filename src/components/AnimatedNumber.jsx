import React, { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up from its previous value to `value`
 * whenever `value` changes. Used to make dashboard stats feel alive
 * instead of silently flipping numbers.
 */
const AnimatedNumber = ({ value = 0, duration = 700, decimals = 0, suffix = "" }) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value) || 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <span className="n-count">{formatted}{suffix}</span>;
};

export default AnimatedNumber;
