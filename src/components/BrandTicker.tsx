// Brand Ticker — full-bleed dark band of repeating serif wordmarks.
type Props = {
  brands: string[]
  withComingSoon?: string[]
}

export function BrandTicker({ brands, withComingSoon = [] }: Props) {
  // Repeat the brand list so the marquee looks continuous even on wide screens.
  const items = [...brands, ...brands, ...brands]

  return (
    <section className="section-ink py-6 overflow-hidden">
      <div className="flex items-center gap-8 animate-[ticker_40s_linear_infinite] whitespace-nowrap">
        {items.map((brand, i) => (
          <span key={`${brand}-${i}`} className="flex items-center gap-8">
            <span className="font-display text-heading-sm text-paper">{brand}</span>
            {withComingSoon.includes(brand) && (
              <span className="border border-paper/80 text-paper text-caption uppercase tracking-tight rounded-xl px-2 py-1 font-ui">
                Coming soon
              </span>
            )}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.33%); }
        }
      `}</style>
    </section>
  )
}
