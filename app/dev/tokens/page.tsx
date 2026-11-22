const colors = [
  { name: "Background", variable: "--bg", value: "#05070a", usage: "Space-black page background" },
  { name: "Surface", variable: "--surface", value: "#101820", usage: "Panels and surfaces" },
  { name: "Raised surface", variable: "--surface-2", value: "#182635", usage: "Hover and raised surfaces" },
  { name: "Amber", variable: "--amber", value: "#e8a045", usage: "Headings, key links and primary accent" },
  { name: "Rust", variable: "--rust", value: "#c47a20", usage: "Borders and secondary accent" },
  { name: "Ember", variable: "--ember", value: "#7a3d00", usage: "Muted lines and disabled states" },
  { name: "Ink", variable: "--ink", value: "#f3e3c8", usage: "Body text" },
  { name: "Ion", variable: "--ion", value: "#6cb8ff", usage: "Sparse HUD accents and starfield details" },
];

export default function TokensPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto min-h-screen w-full max-w-6xl px-5 py-12 text-ink sm:px-8 sm:py-16">
      <header className="mb-12 max-w-3xl">
        <p className="mb-3 font-mono text-sm text-amber">Development reference</p>
        <h1 className="mb-4 text-4xl text-amber sm:text-5xl">Design tokens</h1>
        <p className="max-w-[65ch] text-lg leading-relaxed text-ink">
          The color and type foundations for the portfolio, defined as CSS variables and
          available through Tailwind utilities.
        </p>
      </header>

      <section aria-labelledby="color-heading" className="mb-16">
        <h2 id="color-heading" className="mb-5 text-2xl text-amber">
          Color palette
        </h2>
        <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {colors.map((color) => (
            <li
              key={color.variable}
              className="overflow-hidden rounded-2xl border border-rust bg-surface"
            >
              <div
                aria-hidden="true"
                className="h-24 border-b border-rust"
                style={{ backgroundColor: `var(${color.variable})` }}
              />
              <div className="p-4">
                <h3 className="mb-1 text-lg text-ink">{color.name}</h3>
                <p className="font-mono text-sm text-amber">
                  {color.variable} · {color.value}
                </p>
                <p className="mt-2 text-sm text-ink">{color.usage}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type-heading">
        <h2 id="type-heading" className="mb-5 text-2xl text-amber">
          Typography
        </h2>
        <div className="space-y-4">
          <article className="rounded-2xl border border-rust bg-surface p-5 sm:p-7">
            <p className="mb-3 font-mono text-sm text-amber">Display · Chakra Petch</p>
            <h3 className="text-3xl leading-snug text-ink sm:text-4xl">
              Thoughtful systems make reliable products.
            </h3>
            <p className="mt-3 font-mono text-xs text-amber">font-display · heading / 36px / 600</p>
          </article>

          <article className="rounded-2xl border border-rust bg-surface p-5 sm:p-7">
            <p className="mb-3 font-mono text-sm text-amber">Body · IBM Plex Sans</p>
            <p className="max-w-[65ch] text-lg leading-relaxed text-ink">
              Queues, retrieval, streaming and fault tolerance help AI products respond
              consistently as their workloads grow.
            </p>
            <p className="mt-3 font-mono text-xs text-amber">font-sans · body / 18px / 400</p>
          </article>

          <article className="rounded-2xl border border-rust bg-surface p-5 sm:p-7">
            <p className="mb-3 font-mono text-sm text-amber">Code and metrics · Fira Code</p>
            <p className="font-mono text-base text-ink">await queue.publish({`{ job: "summarize" }`});</p>
            <p className="mt-3 font-mono text-xs text-amber">font-mono · code / 16px / 400</p>
          </article>
        </div>
      </section>
    </main>
  );
}
