import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

/** Small balance trend chart shown on the account tile. */
export function Sparkline({ data, id }: { data: { day: string; balance: number }[]; id: string }) {
  const gid = `spark-${id}`;
  return (
    <div className="h-20 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="linear" dataKey="balance" stroke="var(--positive)" strokeWidth={2.5} fill={`url(#${gid})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
