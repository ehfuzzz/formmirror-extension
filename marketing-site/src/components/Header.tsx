import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from './Button'
import logo from '../assets/logo.svg'
import { cn } from '../utils/cn'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/docs/getting-started', label: 'Docs' },
]

const repoUrl = import.meta.env.VITE_REPO_URL ?? 'https://github.com/ehfuzzz/formmirror-extension'

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="FormMirror home">
          <img src={logo} alt="FormMirror" className="h-8 w-auto" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'text-sm font-semibold text-steel transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  isActive && 'text-blue-700',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:flex">
          <Button as="a" href={repoUrl} target="_blank" rel="noreferrer">
            Install on Chrome
          </Button>
        </div>
        <button
          type="button"
          className="md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <span className="sr-only">Toggle navigation</span>
          {open ? <X className="h-6 w-6 text-ink" /> : <Menu className="h-6 w-6 text-ink" />}
        </button>
      </div>
      <nav
        id="mobile-nav"
        className={cn(
          'border-t border-blue-100 bg-white transition-all md:hidden',
          open ? 'max-h-96 opacity-100' : 'max-h-0 overflow-hidden opacity-0',
        )}
      >
        <div className="flex flex-col gap-4 px-6 pb-6 pt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn('text-base font-semibold text-steel', isActive && 'text-blue-700')
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <Button as="a" href={repoUrl} target="_blank" rel="noreferrer">
            Install on Chrome
          </Button>
        </div>
      </nav>
    </header>
  )
}
