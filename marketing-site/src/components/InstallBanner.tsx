import { Button } from './Button'

const repoUrl = import.meta.env.VITE_REPO_URL ?? 'https://github.com/ehfuzzz/formmirror-extension'

export function InstallBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-10 shadow-lg">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Install today</p>
        <h2 className="text-3xl font-semibold text-ink">Mirror any form in minutes, not hours.</h2>
        <p className="text-sm text-steel">
          Drop in a completed form screenshot, confirm mid-confidence matches, and let FormMirror drive
          the keyboard events for you—always local, framework-safe, and privacy-first.
        </p>
        <Button as="a" href={repoUrl} target="_blank" rel="noreferrer" className="shadow-md">
          Install on Chrome
        </Button>
      </div>
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl"
        aria-hidden
      />
    </div>
  )
}
