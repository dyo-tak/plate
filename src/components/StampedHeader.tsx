// Stamped Display Section Header — full-bleed dark band, Manuka slab type.
type Props = {
  eyebrow?: string
  title: string
  trailing?: string
}

export function StampedHeader({ eyebrow, title, trailing = '—' }: Props) {
  return (
    <section className="section-ink py-12 md:py-16 px-2 overflow-hidden">
      {eyebrow && (
        <div className="px-6 md:px-10 mb-6 text-caption uppercase opacity-60 font-ui tracking-tight">
          {eyebrow}
        </div>
      )}
      <h2 className="font-condensed text-[120px] md:text-[226px] leading-[0.75] whitespace-nowrap text-paper pl-2 md:pl-4">
        {title}
        <span className="opacity-70 ml-2">{trailing}</span>
      </h2>
    </section>
  )
}
