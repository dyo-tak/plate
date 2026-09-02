import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Index' },
  { to: '/notes', label: 'Notes' },
  { to: '/settings', label: 'Settings' },
]

export function Nav() {
  return (
    <nav className="px-6 md:px-10 py-6 flex items-baseline gap-6 section-paper">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'uppercase tracking-tight font-ui',
              isActive ? 'text-base font-bold' : 'text-xs font-bold',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
      <span className="ml-auto text-caption uppercase tracking-tight opacity-60">
        ° Plate
      </span>
    </nav>
  )
}
