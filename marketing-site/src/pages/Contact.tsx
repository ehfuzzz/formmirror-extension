import { Helmet } from 'react-helmet-async'
import { Section } from '../components/Section'
import { ContactForm } from '../components/ContactForm'
import { InstallBanner } from '../components/InstallBanner'

export default function Contact() {
  return (
    <>
      <Helmet>
        <title>Contact FormMirror</title>
        <meta
          name="description"
          content="Tell us about your forms and we’ll help you onboard FormMirror’s screenshot-to-autofill workflows."
        />
      </Helmet>
      <Section className="pt-16" background="subtle">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <ContactForm />
          <div className="space-y-6 text-sm text-steel">
            <div className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-ink">What to expect</h2>
              <ul className="mt-4 space-y-3">
                <li>Personalized onboarding tailored to your workflows.</li>
                <li>Macro Studio deep dives for operations-heavy teams.</li>
                <li>Security packet covering architecture, CSP, and storage.</li>
              </ul>
            </div>
            <InstallBanner />
          </div>
        </div>
      </Section>
    </>
  )
}
