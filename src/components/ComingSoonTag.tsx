// Coming Soon Tag — ghost outlined pill, used in tickers + cards.
type Props = {
  children: React.ReactNode
}

export function ComingSoonTag({ children }: Props) {
  return (
    <span className="inline-block border border-current text-caption uppercase tracking-tight rounded-xl px-2 py-1 font-ui">
      {children}
    </span>
  )
}
