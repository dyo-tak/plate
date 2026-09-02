import { Link } from 'react-router-dom'

export function Home() {
  return (
    <main>
      {/* -- Hero: oversized serif headline, full-bleed -- */}
      <section className="section-paper px-6 md:px-10 pt-12 md:pt-20 pb-16 md:pb-24">
        <p className="text-caption uppercase tracking-tight font-ui mb-6 opacity-60">
          ° A working broadside for your notes
        </p>
        <h1 className="font-display text-[88px] md:text-display leading-[0.8] text-headline-ink">
          Notes on
          <br />
          <em className="font-display italic text-[44px] md:text-[60px]">paper,</em>
          {' '}in ink.
        </h1>
        <p className="mt-8 max-w-prose text-subheading font-display">
          A small, offline-first notes app that syncs to GitHub, Google Drive, or OneDrive.
          One file, one page, one color. The type does the work.
        </p>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            to="/notes"
            className="inline-block border border-headline-ink text-headline-ink text-caption uppercase tracking-tight font-bold rounded-xl px-6 py-3 font-ui hover:bg-headline-ink hover:text-paper transition-colors"
          >
            Open the notes
          </Link>
          <Link
            to="/settings"
            className="text-caption uppercase tracking-tight font-ui opacity-60 hover:opacity-100"
          >
            ° or set up sync →
          </Link>
        </div>
      </section>

      {/* -- Section rule -- */}
      <hr className="border-headline-ink" />

      {/* -- Top ticker banner (announcement strip) -- */}
      <div className="px-6 md:px-10 py-2 section-paper text-caption uppercase tracking-tight font-ui flex items-center justify-between">
        <span>° Plate v0.1 — print edition</span>
        <span className="opacity-60">Three sync adapters · offline-first</span>
      </div>

      <hr className="border-headline-ink" />
    </main>
  )
}
