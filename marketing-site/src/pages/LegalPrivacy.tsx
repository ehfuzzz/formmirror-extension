import { Helmet } from 'react-helmet-async'
import { Section } from '../components/Section'

export default function LegalPrivacy() {
  return (
    <>
      <Helmet>
        <title>FormMirror Privacy Notice</title>
        <meta
          name="description"
          content="Learn how FormMirror handles data, storage, and privacy for screenshot-to-autofill workflows."
        />
      </Helmet>
      <Section className="pt-16" background="subtle">
        <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-ink">Privacy Notice</h1>
          <p className="text-sm text-steel">
            FormMirror keeps your data local. The extension runs OCR, matching, and filling inside the browser using
            WebAssembly. We never upload screenshots or recognized text to any server.
          </p>
          <section className="space-y-3 text-sm text-steel">
            <h2 className="text-xl font-semibold text-ink">Collection & Processing</h2>
            <p>
              FormMirror processes screenshots entirely in memory for the duration of your session. Rules and macros
              contain selector metadata only—no form values are stored.
            </p>
          </section>
          <section className="space-y-3 text-sm text-steel">
            <h2 className="text-xl font-semibold text-ink">Storage</h2>
            <p>
              Saved rules and macros live in `chrome.storage.local`. You can clear them anytime from **Settings →
              Privacy** inside the extension.
            </p>
          </section>
          <section className="space-y-3 text-sm text-steel">
            <h2 className="text-xl font-semibold text-ink">Analytics</h2>
            <p>
              Analytics are disabled by default. If you opt in, event counts are stored locally and never transmitted. You can
              opt out at any time.
            </p>
          </section>
          <section className="space-y-3 text-sm text-steel">
            <h2 className="text-xl font-semibold text-ink">Contact</h2>
            <p>
              Questions? Email <a className="text-blue-700 underline-offset-2 hover:underline" href="mailto:hello@formmirror.dev">hello@formmirror.dev</a>
              and we’ll respond within two business days.
            </p>
          </section>
        </div>
      </Section>
    </>
  )
}
