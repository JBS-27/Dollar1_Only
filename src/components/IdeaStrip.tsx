const IDEAS = [
  {
    index: "01",
    title: "Equal",
    line: "No one can give more. No one can give less.",
  },
  {
    index: "02",
    title: "Signal",
    line: "A belief. Not a tip, and not a rank.",
  },
  {
    index: "03",
    title: "Earth",
    line: "A country wakes only when it chooses.",
  },
] as const;

export function IdeaStrip() {
  return (
    <section id="idea" className="relative z-[2] mx-auto flex min-h-[88svh] max-w-5xl flex-col justify-center px-6 py-24">
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.34em] text-cyan-glow/65">
        The idea
      </p>
      <h2 className="mx-auto mt-4 max-w-xl text-center font-display text-[1.7rem] font-medium leading-tight tracking-[-0.04em] text-white sm:text-[2.15rem]">
        One amount. Every country. Nothing more.
      </h2>
      <ol className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
        {IDEAS.map((idea) => (
          <li key={idea.index} className="idea-card">
            <span className="idea-index">{idea.index}</span>
            <h3 className="idea-title">{idea.title}</h3>
            <p className="mt-3 text-balance text-[15px] leading-relaxed text-white/68">{idea.line}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
