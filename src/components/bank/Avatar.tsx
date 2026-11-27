import { avatarTone, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  "chart-4": "bg-chart-4",
  "chart-5": "bg-chart-5",
  "chart-6": "bg-chart-6",
};

export function RecipientAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-extrabold text-primary-foreground",
        toneClass[avatarTone(name)],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
