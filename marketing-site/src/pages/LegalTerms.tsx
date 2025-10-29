import { Helmet } from 'react-helmet-async'
import { Section } from '../components/Section'

export default function LegalTerms() {
  return (
    <>
      <Helmet>
        <title>FormMirror Terms of Use</title>
        <meta
          name="description"
          content="Understand the beta terms, acceptable use, and limitations of liability for FormMirror."
        />
      </Helmet>
      <Section className="pt-16" background="subtle">
        <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-ink">Terms of Use</h1>
          <p className="text-sm text-steel">
            FormMirror is currently in beta. By installing or using the extension you agree to these terms.
          </p>
          <section className="space-y-3 text-sm text-steel">
            <h2 className="text-xl font-semibold text-ink">Acceptable Use</h2>
            <p>
              Use FormMirror for lawful workflows. Do not submit content you lack permission to process. Respect website terms of
              service and local regulations.
            </p>
          </section>
          <section className="space-y-3 text-sm text-steel">
            <h2 className="text-xl font-semibold text-ink">Beta Disclaimer</h2>
            <p>
              Features may change without notice. The extension is provided “as-is” and may contain bugs. We do not guarantee
              uptime or compatibility with every website.
            </p>
          </section>
          <section className="space-y-3 text-sm text-steel">
            <h2 className="text-xl font-semibold text-ink">Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, FormMirror is not liable for indirect, incidental, or consequential damages
              arising from use of the extension. Your sole remedy is to stop using the product.
            </p>
          </section>
          <section className="space-y-3 text-sm text-steel">
            <h2 className="text-xl font-semibold text-ink">Contact</h2>
            <p>
              For legal questions email <a className="text-blue-700 underline-offset-2 hover:underline" href="mailto:legal@formmirror.dev">legal@formmirror.dev</a>.
            </p>
          </section>
        </div>
      </Section>
    </>
  )
}
