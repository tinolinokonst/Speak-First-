import React, { useEffect, useRef, useState } from "react";

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────
// Children fade in and translate up 16px over 400ms when the element enters the
// viewport, once. Pass `delay` (seconds) to stagger items in a grid. When
// prefers-reduced-motion is set, the effect is disabled entirely and children
// render immediately with no transition.
//
// Any extra props (className, onClick, …) are forwarded to the wrapper div, so
// Reveal can BE the card/tile element rather than adding a nesting level.
export default function Reveal({ children, delay = 0, threshold = 0.12, style, ...rest }) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ref = useRef(null);
  const [visible, setVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [reducedMotion, threshold]);

  const revealStyle = reducedMotion
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity .4s ease, transform .4s ease",
        transitionDelay: `${delay}s`,
      };

  return (
    <div ref={ref} style={{ ...style, ...revealStyle }} {...rest}>
      {children}
    </div>
  );
}
