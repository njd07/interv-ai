export function ScoreRing({ value, max = 100, label, size = 140 }: { value: number; max?: number; label?: string; size?: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const color = pct > 0.75 ? "var(--cyan)" : pct > 0.5 ? "var(--violet)" : "oklch(0.7 0.2 30)";

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="color-mix(in oklch, white 12%, transparent)" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={8} fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease-out", filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-3xl font-bold" style={{ color }}>{Math.round(value)}</div>
        {label && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>}
      </div>
    </div>
  );
}
