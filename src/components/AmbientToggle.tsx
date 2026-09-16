type Props = {
  muted: boolean;
  onToggle: () => void;
};

export function AmbientToggle({ muted, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={muted ? "Play $1 Only ambient sound" : "Mute ambient sound"}
      className="fixed bottom-5 right-5 z-40 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/45 backdrop-blur hover:text-white/80"
    >
      {muted ? "Sound off" : "Sound on"}
    </button>
  );
}
