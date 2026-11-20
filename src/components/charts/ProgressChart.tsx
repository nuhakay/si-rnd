"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ProgressChart({ data }: { data: { month: string; progress: number }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`Progress over time: ${data.map((d) => `${d.month} ${d.progress}%`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D9FF" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#00D9FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(0,217,255,0.08)" vertical={false} />
          <XAxis dataKey="month" stroke="#8fb3c9" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} stroke="#8fb3c9" fontSize={11} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={{ background: "#0C1830", border: "1px solid rgba(0,217,255,0.3)", borderRadius: 8, color: "#EAF7FF" }} formatter={(v) => [`${v}%`, "Progress"]} />
          <Area type="monotone" dataKey="progress" stroke="#00D9FF" strokeWidth={2} fill="url(#pg)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
