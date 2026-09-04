import { NavLink } from 'react-router-dom'

const items = [
  { to: '/notes', label: 'Notes' },
  { to: '/settings', label: 'Settings' },
]

export function Nav() {
  return (
    <nav className="h-12 md:h-14 px-4 md:px-10 flex items-center gap-4 md:gap-6 section-paper border-b border-hairline">
      <span className="font-display text-base md:text-lg text-headline-ink mr-1">Plate</span>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              'uppercase tracking-tight font-ui text-caption md:text-xs',
              'font-bold',
              isActive ? 'underline underline-offset-4' : 'opacity-50 hover:opacity-100',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
      <span className="ml-auto text-caption uppercase tracking-tight opacity-40 font-ui hidden sm:inline">
        ° editorial
      </span>
    </nav>
  )
}
