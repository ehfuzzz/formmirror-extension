import { FormEvent, useMemo, useRef, useState } from 'react'
import { Button } from './Button'

const repoUrl = import.meta.env.VITE_REPO_URL ?? 'https://github.com/ehfuzzz/formmirror-extension'
const contactEndpoint = import.meta.env.VITE_CONTACT_ENDPOINT

interface FormState {
  status: 'idle' | 'submitting' | 'success' | 'error'
  message?: string
}

export function ContactForm() {
  const [state, setState] = useState<FormState>({ status: 'idle' })
  const startTime = useRef<number | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    if (!startTime.current) {
      startTime.current = Date.now()
    }

    const honey = formData.get('company_url')
    if (typeof honey === 'string' && honey.length > 0) {
      setState({ status: 'success', message: 'Thanks! We will be in touch shortly.' })
      form.reset()
      return
    }

    const elapsed = Date.now() - (startTime.current ?? Date.now())
    if (elapsed < 1500) {
      setState({ status: 'error', message: 'Please take a moment to complete the form before submitting.' })
      return
    }

    if (!contactEndpoint) {
      setState({
        status: 'error',
        message: 'No contact endpoint configured. Please reach us at hello@formmirror.dev.',
      })
      return
    }

    setState({ status: 'submitting' })

    const payload = {
      name: formData.get('name')?.toString().trim(),
      email: formData.get('email')?.toString().trim(),
      company: formData.get('company')?.toString().trim(),
      usage: formData.get('usage')?.toString().trim(),
      consent: formData.get('consent') === 'on',
    }

    try {
      const response = await fetch(contactEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      setState({ status: 'success', message: 'Thanks! We will be in touch shortly.' })
      form.reset()
    } catch (error) {
      console.error(error)
      setState({
        status: 'error',
        message: 'Something went wrong. Please email hello@formmirror.dev and we will help out.',
      })
    }
  }

  const fallbackMailto = useMemo(() => `mailto:hello@formmirror.dev?subject=FormMirror%20Contact`, [])

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-8 shadow-md">
      <h2 className="text-2xl font-semibold text-ink">Tell us about your forms</h2>
      <p className="mt-2 text-sm text-steel">
        We’ll reach out with onboarding guidance, product updates, and advanced macro workflows.
      </p>
      {!contactEndpoint && (
        <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Prefer email? Contact us at{' '}
          <a className="font-semibold" href={fallbackMailto}>
            hello@formmirror.dev
          </a>
          .
        </p>
      )}
      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-6"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-semibold text-ink">
              Name
            </label>
            <input
              required
              id="name"
              name="name"
              type="text"
              className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-semibold text-ink">
              Email
            </label>
            <input
              required
              id="email"
              name="email"
              type="email"
              inputMode="email"
              className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="company" className="text-sm font-semibold text-ink">
            Company (optional)
          </label>
          <input
            id="company"
            name="company"
            type="text"
            className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="usage" className="text-sm font-semibold text-ink">
            How do you use forms today?
          </label>
          <textarea
            required
            id="usage"
            name="usage"
            rows={5}
            className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          />
        </div>
        <div className="relative hidden">
          <label htmlFor="company_url" className="sr-only">
            Company URL
          </label>
          <input id="company_url" name="company_url" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="flex items-start gap-3">
          <input
            required
            type="checkbox"
            id="consent"
            name="consent"
            className="mt-1 h-5 w-5 rounded border border-border text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="consent" className="text-sm text-steel">
            I agree to be contacted about FormMirror. Read our{' '}
            <a className="font-semibold text-blue-700 underline-offset-2 hover:underline" href="/legal/privacy">
              privacy notice
            </a>
            .
          </label>
        </div>
        <Button type="submit" disabled={state.status === 'submitting'}>
          {state.status === 'submitting' ? 'Sending…' : 'Submit'}
        </Button>
        <div role="status" aria-live="polite" className="text-sm">
          {state.status === 'error' && <p className="text-red-600">{state.message}</p>}
          {state.status === 'success' && <p className="text-blue-700">{state.message}</p>}
        </div>
      </form>
      <p className="mt-6 text-xs text-steel">
        Developers can also explore the extension directly on{' '}
        <a className="text-blue-700 underline-offset-2 hover:underline" href={repoUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
    </div>
  )
}
