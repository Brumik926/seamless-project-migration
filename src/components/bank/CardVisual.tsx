import forest from "@/assets/card-forest-art.jpg";
import mono from "@/assets/card-mono-art.jpg";
import { cn } from "@/lib/utils";
import { VegaMark } from "./Logo";
import { Lock } from "lucide-react";

const DESIGNS: Record<string, string> = { forest, mono };

type Props = {
  design: string;
  brand: string;
  cardType: string;
  holder?: string;
  number?: string;
  blocked?: boolean;
  size?: "lg" | "sm";
  className?: string;
};

/** Payment card artwork with chip, mark and network label. */
export function CardVisual({ design, brand, cardType, holder, number, blocked, size = "lg", className }: Props) {
  const dark = design !== "mono";
  return (
    <div
      className={cn(
        "relative aspect-[1.586] overflow-hidden rounded-2xl border border-white/15 shadow-[0_14px_32px_-16px_rgba(0,0,0,0.55)]",
        size === "sm" ? "w-28 rounded-lg" : "w-full",
        className,
      )}
      role="img"
      aria-label={`${brand} ${cardType === "credit" ? "kreditná" : "debetná"} karta${number ? " " + number : ""}`}
    >
      <img src={DESIGNS[design] ?? forest} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" />
      <div className={cn("absolute inset-0", dark ? "text-paper" : "text-ink")}>
        <VegaMark className={cn("absolute", size === "sm" ? "top-1.5 left-1.5 h-3 w-4" : "top-4 left-4 h-7 w-9")} />
        {size === "lg" ? (
          <>
            <div className="absolute top-[38%] left-[9%] h-[18%] w-[13%] overflow-hidden rounded-md border border-black/20 bg-gradient-to-br from-[#F7E6B0] via-[#C7B47C] to-[#8F8058] shadow-sm">
              <span className="absolute top-0 left-1/2 h-full w-px bg-black/20" />
              <span className="absolute top-1/2 left-0 h-px w-full bg-black/20" />
              <span className="absolute top-0 left-1/4 h-full w-1/2 rounded-sm border-x border-black/15" />
            </div>
            {number ? (
              <div className="absolute bottom-[29%] left-[9%] whitespace-nowrap text-xs font-semibold drop-shadow">{number}</div>
            ) : null}
            {holder ? (
              <div className="absolute bottom-[9%] left-[9%] max-w-[55%] truncate text-[0.7rem] font-semibold tracking-wider uppercase drop-shadow">
                {holder}
              </div>
            ) : null}
          </>
        ) : null}
        <div
          className={cn(
            "absolute right-[6%] bottom-[7%] text-right font-black italic drop-shadow",
            size === "sm" ? "text-[0.6rem]" : "text-2xl",
          )}
        >
          {brand.toUpperCase().includes("VISA") ? "VISA" : "mastercard"}
          {size === "lg" ? (
            <div className="text-[0.6rem] font-medium not-italic">{cardType === "credit" ? "Kreditná" : "Debetná"}</div>
          ) : null}
        </div>
      </div>
      {blocked ? (
        <div className="absolute inset-0 grid place-items-center bg-canvas/70 backdrop-blur-[2px]">
          <span className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-bold text-negative">
            <Lock className="h-3.5 w-3.5" /> Zablokovaná
          </span>
        </div>
      ) : null}
    </div>
  );
}
