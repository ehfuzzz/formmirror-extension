import { Helmet } from 'react-helmet-async'
import { Section } from '../components/Section'
import { Button } from '../components/Button'

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page not found | FormMirror</title>
      </Helmet>
      <Section className="pt-24" background="subtle">
        <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">404</p>
          <h1 className="text-3xl font-semibold text-ink">We couldn’t find that page.</h1>
          <p className="text-sm text-steel">
            The link may be broken or the page may have moved. Let’s get you back to something helpful.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button as="a" href="/">
              Return home
            </Button>
            <Button as="a" href="/docs/getting-started" variant="secondary">
              View docs
            </Button>
          </div>
        </div>
      </Section>
    </>
  )
}
