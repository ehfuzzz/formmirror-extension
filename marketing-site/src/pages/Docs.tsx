import { Helmet } from 'react-helmet-async'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import { DocSidebar } from '../components/DocSidebar'
import { Section } from '../components/Section'
import { mdxComponents } from '../components/MDXComponents'
import GettingStarted from '../content/docs/getting-started.mdx'
import NormalMode from '../content/docs/normal-mode.mdx'
import MacroMode from '../content/docs/macro-mode.mdx'
import PrivacyAndStorage from '../content/docs/privacy-and-storage.mdx'
import DeveloperSetup from '../content/docs/developer-setup.mdx'
import Roadmap from '../content/docs/roadmap.mdx'

const docRoutes = [
  { path: 'getting-started', label: 'Getting Started' },
  { path: 'normal-mode', label: 'Normal Mode' },
  { path: 'macro-mode', label: 'Macro Mode' },
  { path: 'privacy-and-storage', label: 'Privacy & Storage' },
  { path: 'developer-setup', label: 'Developer Setup' },
  { path: 'roadmap', label: 'Roadmap' },
]

export default function Docs() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <Helmet>
        <title>FormMirror Documentation</title>
        <meta
          name="description"
          content="Learn how to install, configure, and master FormMirror’s screenshot-to-autofill workflows."
        />
      </Helmet>
      <Section background="subtle" className="pt-16">
        <div className="flex flex-col gap-12 lg:flex-row">
          <div className="lg:hidden">
            <label htmlFor="doc-nav" className="sr-only">Select a documentation page</label>
            <select
              id="doc-nav"
              className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-blue-300 focus:outline-none"
              value={location.pathname.replace('/docs/', '') || 'getting-started'}
              onChange={(event) => navigate(`/docs/${event.target.value}`)}
            >
              {docRoutes.map((route) => (
                <option key={route.path} value={route.path}>
                  {route.label}
                </option>
              ))}
            </select>
          </div>
          <DocSidebar />
          <div className="w-full min-w-0 rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
            <MDXProvider components={mdxComponents}>
              <Routes>
                <Route index element={<Navigate to="getting-started" replace />} />
                <Route path="getting-started" element={<GettingStarted />} />
                <Route path="normal-mode" element={<NormalMode />} />
                <Route path="macro-mode" element={<MacroMode />} />
                <Route path="privacy-and-storage" element={<PrivacyAndStorage />} />
                <Route path="developer-setup" element={<DeveloperSetup />} />
                <Route path="roadmap" element={<Roadmap />} />
                <Route path="*" element={<Navigate to="getting-started" replace />} />
              </Routes>
            </MDXProvider>
          </div>
        </div>
      </Section>
    </>
  )
}
