import { Link } from 'react-router-dom'
import { Button } from './Button'

const repoUrl = import.meta.env.VITE_REPO_URL ?? 'https://github.com/ehfuzzz/formmirror-extension'

export function Footer() {
  return (
    <footer className="border-t border-blue-100 bg-white">
      <div className="container mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold text-ink">FormMirror</h2>
            <p className="mt-3 text-sm text-steel">
              Screenshot to autofill extension that keeps everything local. Drag in a completed form image and
              mirror the answers into any live web form with confidence.
            </p>
            <div className="mt-6">
              <Button as="a" href={repoUrl} target="_blank" rel="noreferrer">
                Install on Chrome
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm text-steel">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/70">Product</p>
              <Link to="/" className="block hover:text-blue-700">
                Home
              </Link>
              <Link to="/docs/getting-started" className="block hover:text-blue-700">
                Documentation
              </Link>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/70">Company</p>
              <a
                href="https://github.com/ehfuzzz/formmirror-extension"
                target="_blank"
                rel="noreferrer"
                className="block hover:text-blue-700"
              >
                GitHub
              </a>
              <Link to="/legal/privacy" className="block hover:text-blue-700">
                Privacy
              </Link>
              <Link to="/legal/terms" className="block hover:text-blue-700">
                Terms
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-blue-100 pt-6 text-xs text-steel">
          <p>© {new Date().getFullYear()} FormMirror. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
