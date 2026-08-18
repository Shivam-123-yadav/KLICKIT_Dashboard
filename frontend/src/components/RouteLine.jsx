import { useEffect, useRef, useState } from "react";
import { BRANCHES } from "../utils/constants";

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * activeIndex: -1 (none), 0..BRANCHES.length-1
 * ambient: if true, cycles through branches automatically (login page)
 */
export default function RouteLine({ activeIndex = -1, ambient = false }) {
  const [idx, setIdx] = useState(ambient ? 0 : activeIndex);

  useEffect(() => {
    if (!ambient) {
      setIdx(activeIndex);
    }
  }, [ambient, activeIndex]);

  useEffect(() => {
    if (!ambient || prefersReducedMotion) return;
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % BRANCHES.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [ambient]);

  const ratio = BRANCHES.length > 1 ? idx / (BRANCHES.length - 1) : 0;
  const pct = 4 + ratio * 92;

  return (
    <div className="route-line" id="routeLine">
      <div className="route-progress" id="routeProgress" style={{ width: `${pct}%` }}></div>
      {BRANCHES.map((name, i) => (
        <div className={`stop${i === idx ? " is-active" : ""}`} key={name} data-index={i}>
          <span className="stop-dot"></span>
          <span className="stop-name">{name}</span>
        </div>
      ))}
    </div>
  );
}
