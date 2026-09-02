// Inverted Editorial Letter — centered serif prose on a full-bleed dark band.
type Props = {
  topEyebrow?: string
  body: string
  bottomEyebrow?: string
}

export function InvertedLetter({ topEyebrow, body, bottomEyebrow }: Props) {
  return (
    <section className="section-ink py-16 md:py-24 px-6 md:px-10">
      {topEyebrow && (
        <p className="text-center text-caption uppercase tracking-tight opacity-60 mb-8 font-ui">
          {topEyebrow}
        </p>
      )}
      <p className="editorial-prose text-paper">{body}</p>
      {bottomEyebrow && (
        <p className="text-center text-caption uppercase tracking-tight opacity-60 mt-8 font-ui">
          {bottomEyebrow}
        </p>
      )}
    </section>
  )
}
