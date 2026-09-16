import { cn } from "../lib/cn";

type Props = {
  text: string;
  className?: string;
};

export function FeeNote({ text, className }: Props) {
  return (
    <p className={cn("text-center text-[13px] leading-relaxed text-white/45", className)}>
      {text}
    </p>
  );
}
