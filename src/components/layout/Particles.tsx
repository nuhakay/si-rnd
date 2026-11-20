/** Static positions, CSS-only drift. Hidden in low-motion mode. */
const DOTS = [
  [8, 92, 0], [17, 78, 3], [26, 88, 7], [38, 95, 11], [47, 70, 5], [58, 90, 9], [66, 84, 2], [74, 96, 13], [83, 76, 6], [91, 89, 10], [12, 60, 15], [87, 55, 4],
];
export function Particles() {
  return (
    <div className="hud-particles pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {DOTS.map(([x, y, delay], i) => (
        <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />
      ))}
    </div>
  );
}
