import { NavLink } from 'react-router-dom'
import { cn } from '../utils/cn'

const links = [
  { to: '/docs/getting-started', label: 'Getting Started' },
  { to: '/docs/normal-mode', label: 'Normal Mode' },
  { to: '/docs/macro-mode', label: 'Macro Mode' },
  { to: '/docs/privacy-and-storage', label: 'Privacy & Storage' },
  { to: '/docs/developer-setup', label: 'Developer Setup' },
  { to: '/docs/roadmap', label: 'Roadmap' },
]

export function DocSidebar() {
  return (
    <aside className="sticky top-24 hidden h-fit w-64 flex-shrink-0 rounded-xl border border-blue-100 bg-white/80 p-6 shadow-sm backdrop-blur lg:block">
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'block rounded-lg px-3 py-2 text-sm font-semibold text-steel transition hover:bg-blue-50 hover:text-blue-700',
                isActive && 'bg-blue-50 text-blue-700',
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
