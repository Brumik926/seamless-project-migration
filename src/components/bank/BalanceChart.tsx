import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/format";

/** "Vývoj zostatkov": daily balance chart with axes. */
export function BalanceChart({ data }: { data: { day: string; balance: number }[] }) {
  const fmtDay = (d: string) => {
    const [, m, day] = d.split("-");
    return `${Number(day)}.${Number(m)}`;
  };
  return (
    <div className="h-56 w-full" role="img" aria-label="Vývoj zostatku za posledných 30 dní">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="bal-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} interval={4} />
          <YAxis
            domain={[(min: number) => Math.floor((min * 0.9) / 50) * 50, (max: number) => Math.ceil((max * 1.05) / 50) * 50]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--popover-foreground)" }}
            labelFormatter={(d: string) => fmtDay(d)}
            formatter={(v: number) => [formatMoney(v), "Zostatok"]}
          />
          <Area type="linear" dataKey="balance" stroke="var(--positive)" strokeWidth={2.5} fill="url(#bal-fill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
