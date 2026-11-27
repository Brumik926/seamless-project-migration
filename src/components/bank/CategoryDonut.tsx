import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { categoryOf, type CategoryKey } from "@/lib/categories";

export function CategoryDonut({
  data,
  size = 180,
}: {
  data: { key: CategoryKey; amount: number; share: number }[];
  size?: number;
}) {
  if (data.length === 0) {
    return (
      <div style={{ width: size, height: size }} className="grid place-items-center rounded-full border-[18px] border-muted text-xs text-muted-foreground">
        Bez výdavkov
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size }} role="img" aria-label="Rozdelenie výdavkov podľa kategórií">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="key" innerRadius="55%" outerRadius="100%" stroke="none" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={categoryOf(d.key).color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
