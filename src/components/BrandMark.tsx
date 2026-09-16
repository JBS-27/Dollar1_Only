import { cn } from "../lib/cn";

type Props = {
  size?: "sm" | "md" | "lg" | "hero";
  glow?: boolean;
  className?: string;
};

const sizes = {
  sm: "text-sm",
  md: "text-2xl",
  lg: "text-5xl",
  hero: "text-[22vw] sm:text-[9.5rem] leading-none",
};

export function BrandMark({ size = "md", glow = true, className }: Props) {
  return (
    <span
      className={cn(
        "font-display font-semibold tracking-[-0.06em] holo-text",
        glow && "dollar-glow",
        sizes[size],
        className,
      )}
    >
      $1
    </span>
  );
}
