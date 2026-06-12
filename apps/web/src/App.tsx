const pillars = [
  {
    title: 'Free local writing',
    body: 'Draft, revise, organize books, chapters, scenes, notes, and Quick Drafts without paying for a cloud account.',
  },
  {
    title: 'Affordable cloud sync',
    body: 'When you want backup and multi-device access, choose a low-cost sync plan built around preserving every edit.',
  },
  {
    title: 'Mobile coming soon',
    body: 'Desktop is the first home for deep work. Mobile writing and review flows are planned for writing wherever ideas arrive.',
  },
];

const writingModel = [
  'Books as the top-level home for essays and fiction projects',
  'Chapters for structure when the work needs it',
  'Top-level episodes for scenes or drafts that should not be forced into a chapter',
  'Quick Drafts for starting immediately before choosing a book',
];

const safetyNotes = [
  'Local-first desktop storage',
  'Autosave designed for long-form work',
  'Yjs CRDT updates instead of last-write-wins',
  'Cloudflare D1 as durable remote storage',
];

const roadmap = [
  {
    phase: 'Now',
    items:
      'Desktop writing, books, chapters, episodes, Quick Drafts, focused mode, local autosave.',
  },
  {
    phase: 'Next',
    items: 'Affordable cloud sync, search, settings, stronger recovery, export foundations.',
  },
  {
    phase: 'Later',
    items: 'Mobile writing mode, realtime collaboration, richer version history, browser reuse.',
  },
];

function App() {
  return (
    <main className="min-h-screen overflow-hidden scroll-smooth bg-[#f3eadc] text-[#1e1a15] selection:bg-[#263d38] selection:text-[#fff8ec]">
      <section className="relative border-[#241b13]/10 border-b px-5 py-6 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(126,93,54,0.14),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(98,120,88,0.14),transparent_24%),radial-gradient(circle_at_60%_78%,rgba(181,76,47,0.12),transparent_28%),linear-gradient(115deg,rgba(255,255,255,0.45),transparent_38%)] opacity-35" />
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[#241b13]/10 bg-[#fff8ec]/75 px-4 py-3 shadow-[0_18px_80px_rgba(45,32,20,0.08)] backdrop-blur">
          <a className="font-semibold text-sm tracking-[0.22em] uppercase" href="#top">
            Goyo
          </a>
          <div className="hidden items-center gap-7 text-[#695b4d] text-sm md:flex">
            <a className="transition hover:text-[#1e1a15]" href="#features">
              Features
            </a>
            <a className="transition hover:text-[#1e1a15]" href="#sync">
              Sync
            </a>
            <a className="transition hover:text-[#1e1a15]" href="#roadmap">
              Roadmap
            </a>
          </div>
          <a
            className="rounded-full bg-[#1e1a15] px-4 py-2 font-medium text-[#fff8ec] text-sm shadow-[0_10px_30px_rgba(30,26,21,0.22)] transition hover:-translate-y-0.5 hover:bg-[#34291f]"
            href="#download"
          >
            Download
          </a>
        </nav>

        <div
          className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 pb-20 pt-20 lg:grid-cols-[0.95fr_1.05fr] lg:pb-28 lg:pt-24"
          id="top"
        >
          <div>
            <div className="mb-7 flex flex-wrap gap-2">
              {['Free by default', 'Affordable cloud sync', 'Mobile coming soon'].map((badge) => (
                <span
                  className="rounded-full border border-[#80613e]/20 bg-[#fff8ec]/65 px-3 py-1.5 font-medium text-[#6c5031] text-xs uppercase tracking-[0.16em]"
                  key={badge}
                >
                  {badge}
                </span>
              ))}
            </div>
            <p className="mb-5 font-medium text-[#7b5c37] text-sm uppercase tracking-[0.28em]">
              Local-first writing for essays and fiction
            </p>
            <h1 className="max-w-3xl text-balance font-serif text-5xl leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              A quiet writing space for long work.
            </h1>
            <p className="mt-7 max-w-2xl text-[#5d5147] text-lg leading-8">
              Write chapters, scenes, notes, essays, and loose drafts in a calm desktop app built to
              protect your words before anything touches the cloud.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex items-center justify-center rounded-full bg-[#b84c2f] px-6 py-3.5 font-semibold text-[#fff8ec] shadow-[0_20px_50px_rgba(184,76,47,0.28)] transition hover:-translate-y-0.5 hover:bg-[#a33f25]"
                href="#download"
              >
                Download for macOS
              </a>
              <a
                className="inline-flex items-center justify-center rounded-full border border-[#241b13]/15 bg-[#fff8ec]/75 px-6 py-3.5 font-semibold text-[#30251b] transition hover:-translate-y-0.5 hover:bg-[#fff8ec]"
                href="#roadmap"
              >
                See the roadmap
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-8 h-36 w-36 rounded-full bg-[#c9d2bd] blur-3xl" />
            <div className="absolute -bottom-8 right-4 h-44 w-44 rounded-full bg-[#d58b61] opacity-50 blur-3xl" />
            <div className="relative rounded-[2rem] border border-[#2a2118]/12 bg-[#201b16] p-3 shadow-[0_35px_120px_rgba(37,28,20,0.32)]">
              <div className="rounded-[1.55rem] border border-white/10 bg-[#f8efe2] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#d86b53]" />
                    <span className="h-3 w-3 rounded-full bg-[#d9b56b]" />
                    <span className="h-3 w-3 rounded-full bg-[#819d74]" />
                  </div>
                  <span className="rounded-full border border-[#2d2319]/10 px-3 py-1 text-[#766654] text-xs">
                    Saved locally
                  </span>
                </div>
                <div className="grid min-h-[520px] gap-4 md:grid-cols-[220px_1fr]">
                  <aside className="rounded-3xl border border-[#2d2319]/10 bg-[#ebe0d0] p-4">
                    <p className="mb-4 font-semibold text-[#37291e] text-xs uppercase tracking-[0.2em]">
                      Library
                    </p>
                    <div className="space-y-2">
                      <div className="rounded-2xl bg-[#fbf6ed] p-3 shadow-sm">
                        <p className="font-semibold text-sm">The Orchard Book</p>
                        <p className="mt-1 text-[#7b6d61] text-xs">Fiction project</p>
                      </div>
                      <div className="rounded-2xl border border-[#2d2319]/10 p-3">
                        <p className="font-semibold text-[#4b4036] text-sm">Quick Drafts</p>
                        <p className="mt-1 text-[#7b6d61] text-xs">3 loose ideas</p>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2 text-sm">
                      <p className="rounded-xl bg-[#d9c9b4] px-3 py-2 font-medium">
                        Top-level episode
                      </p>
                      <p className="px-3 py-2 text-[#7b6d61]">Chapter 01</p>
                      <p className="rounded-xl bg-[#fbf6ed] px-3 py-2 font-medium shadow-sm">
                        Scene: Morning train
                      </p>
                      <p className="px-3 py-2 text-[#7b6d61]">Chapter 02</p>
                    </div>
                  </aside>
                  <article className="rounded-3xl border border-[#2d2319]/10 bg-[#fffaf2] px-6 py-8 sm:px-10">
                    <div className="mb-10 flex items-center justify-between text-[#8a7969] text-xs uppercase tracking-[0.18em]">
                      <span>Focused mode</span>
                      <span>1,284 words</span>
                    </div>
                    <p className="font-serif text-[#3a2d22] text-4xl tracking-[-0.04em]">
                      Morning train
                    </p>
                    <div className="mt-8 space-y-4 text-[#5f5349] leading-8">
                      <p>
                        Draft safely. Move slowly. Keep the structure quiet until the sentence needs
                        a place to live.
                      </p>
                      <p>
                        Books can hold chapters, scenes, essays, notes, and the fragments that are
                        not ready to be named yet.
                      </p>
                    </div>
                    <div className="mt-12 grid gap-3 sm:grid-cols-3">
                      {['Autosaved', 'CRDT-ready', 'Offline safe'].map((item) => (
                        <span
                          className="rounded-2xl bg-[#efe5d6] px-3 py-3 text-center font-medium text-[#6b5b4a] text-xs"
                          key={item}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                className="rounded-[2rem] border border-[#241b13]/10 bg-[#fff8ec]/65 p-7 shadow-[0_18px_70px_rgba(45,32,20,0.06)]"
                key={pillar.title}
              >
                <h2 className="font-serif text-3xl tracking-[-0.04em]">{pillar.title}</h2>
                <p className="mt-4 text-[#66594d] leading-7">{pillar.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-20 grid gap-10 lg:grid-cols-[0.8fr_1fr]">
            <div>
              <p className="font-medium text-[#7b5c37] text-sm uppercase tracking-[0.24em]">
                Flexible structure
              </p>
              <h2 className="mt-4 max-w-xl font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
                Built for writers who do not always know the shape yet.
              </h2>
            </div>
            <div className="grid gap-3">
              {writingModel.map((item, index) => (
                <div
                  className="flex gap-4 rounded-3xl border border-[#241b13]/10 bg-[#fff8ec]/55 p-5"
                  key={item}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#263d38] font-semibold text-[#f8efe2] text-sm">
                    {index + 1}
                  </span>
                  <p className="text-[#51463c] leading-7">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#1e1a15] px-5 py-20 text-[#fff8ec] sm:px-8 lg:px-12" id="sync">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <p className="font-medium text-[#d7b98d] text-sm uppercase tracking-[0.24em]">
              Cloud sync plan
            </p>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl tracking-[-0.05em] sm:text-6xl">
              Free where it matters. Paid only when sync helps.
            </h2>
            <p className="mt-6 max-w-2xl text-[#d8cec0] text-lg leading-8">
              Use the desktop writing app for free. If you want cloud backup, multi-device access,
              and future collaboration features, choose a low-cost sync plan designed for individual
              writers.
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#2a241e] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
            <p className="text-[#d7b98d] text-sm uppercase tracking-[0.24em]">Safety model</p>
            <div className="mt-6 grid gap-3">
              {safetyNotes.map((note) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[#eee3d5]"
                  key={note}
                >
                  {note}
                </div>
              ))}
            </div>
            <p className="mt-6 text-[#bfb2a3] leading-7">
              Sync is being built around incremental document updates, duplicate-safe uploads,
              snapshots, and recovery paths instead of silently overwriting one draft with another.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12" id="download">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-[#241b13]/10 bg-[#fff8ec] p-8 shadow-[0_30px_100px_rgba(45,32,20,0.11)] sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-end">
            <div>
              <p className="font-medium text-[#7b5c37] text-sm uppercase tracking-[0.24em]">
                Download
              </p>
              <h2 className="mt-4 max-w-2xl font-serif text-4xl tracking-[-0.05em] sm:text-6xl">
                Start writing for free.
              </h2>
              <p className="mt-5 max-w-2xl text-[#66594d] text-lg leading-8">
                The desktop app is free for local writing. Cloud sync will be an affordable optional
                plan for writers who want safe backup and access across devices.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <a
                className="rounded-2xl bg-[#b84c2f] px-5 py-4 text-center font-semibold text-[#fff8ec] transition hover:-translate-y-0.5 hover:bg-[#a33f25]"
                href="/downloads/goyo-macos.dmg"
              >
                Download for macOS
              </a>
              <span className="rounded-2xl border border-[#241b13]/10 bg-[#eee4d6] px-5 py-4 text-center font-semibold text-[#796b5f]">
                Windows coming soon
              </span>
              <span className="rounded-2xl border border-[#241b13]/10 bg-[#e3ebdc] px-5 py-4 text-center font-semibold text-[#52694d]">
                Mobile coming soon
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12" id="roadmap">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="font-medium text-[#7b5c37] text-sm uppercase tracking-[0.24em]">
                Roadmap
              </p>
              <h2 className="mt-4 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
                Desktop first. Cloud next. Mobile soon.
              </h2>
            </div>
            <p className="max-w-xl text-[#66594d] leading-7">
              The product is growing from a reliable desktop writing surface toward safe sync,
              recovery, exports, and mobile access.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {roadmap.map((entry) => (
              <article
                className="rounded-[2rem] border border-[#241b13]/10 bg-[#fff8ec]/60 p-6"
                key={entry.phase}
              >
                <h3 className="font-serif text-3xl tracking-[-0.04em]">{entry.phase}</h3>
                <p className="mt-4 text-[#66594d] leading-7">{entry.items}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-[#241b13]/10 border-t px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-[#66594d] text-sm md:flex-row md:items-center">
          <p className="font-semibold text-[#1e1a15]">Goyo</p>
          <p>Built for writers who care about keeping their words safe.</p>
        </div>
      </footer>
    </main>
  );
}

export default App;
