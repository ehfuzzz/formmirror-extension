import { Helmet } from 'react-helmet-async'
import { ArrowDownRight, ShieldCheck, Zap, Puzzle, Accessibility, Cpu, Workflow, Lock } from 'lucide-react'
import { Button } from '../components/Button'
import { HeroScanner } from '../components/HeroScanner'
import { Section } from '../components/Section'
import { FeatureCard } from '../components/FeatureCard'
import { Stepper } from '../components/Stepper'
import { InstallBanner } from '../components/InstallBanner'

const repoUrl = import.meta.env.VITE_REPO_URL ?? 'https://github.com/ehfuzzz/formmirror-extension'

const valueProps = [
  {
    title: 'Drop, paste, done.',
    description:
      'Drag-and-drop, paste from your clipboard, or browse for a file. FormMirror maps the screenshot to the active page in seconds.',
    icon: <Zap className="h-5 w-5" />,
  },
  {
    title: 'Totally local intelligence.',
    description:
      'OCR and matching run entirely in-browser using WebAssembly. No uploads, no servers, no one looking over your shoulder.',
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    title: 'Framework-safe autofill.',
    description:
      'Native setters and real input/change events make React, Vue, Angular, and vanilla forms behave exactly like human typing.',
    icon: <Puzzle className="h-5 w-5" />,
  },
  {
    title: 'Accessible by design.',
    description:
      'WCAG accessible-name algorithm + layout heuristics make sure the right fields light up—even on complex enterprise layouts.',
    icon: <Accessibility className="h-5 w-5" />,
  },
]

const howItWorks = [
  {
    title: 'Upload',
    description: 'Drop a completed form screenshot into FormMirror from drag-and-drop, paste, or file picker.',
  },
  {
    title: 'Recognize',
    description: 'WebAssembly OCR with smart preprocessing extracts word-level data for precise mapping.',
  },
  {
    title: 'Match',
    description: 'Layout, token similarity, and proximity scoring link screenshot labels to live form fields.',
  },
  {
    title: 'Fill',
    description: 'Framework-safe events populate fields with smart handling for dates, selects, and contenteditable.',
  },
  {
    title: 'Review',
    description: 'Confirm mid-confidence matches, skip sensitive inputs, and store selectors locally for future visits.',
  },
]

const featureDeepDive = [
  {
    title: 'Intelligent OCR Pipeline',
    description:
      'WebAssembly-powered Tesseract.js with optional contrast and exposure boosts surfaces word-level boxes, ready for matching.',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: 'Smart Matching & Filling',
    description:
      'Multi-factor similarity scores decide which fields autofill automatically and which go to review, respecting password and file safety.',
    icon: <Workflow className="h-5 w-5" />,
  },
  {
    title: 'Macro Studio (Power User Mode)',
    description:
      'Train reusable macros with region selectors, color filters, and versioned histories—execution reruns OCR on cropped regions for precision.',
    icon: <ArrowDownRight className="h-5 w-5 rotate-90" />,
  },
  {
    title: 'Privacy & Trust',
    description:
      'No network calls, strict CSP, and rules stored only in chrome.storage.local. Analytics are opt-in only.',
    icon: <Lock className="h-5 w-5" />,
  },
]

export default function Home() {
  return (
    <>
      <Helmet>
        <title>FormMirror — Screenshot → Autofill. Instantly.</title>
        <meta
          name="description"
          content="FormMirror turns completed form screenshots into real keystrokes on any live web form—totally local, private, and framework-safe."
        />
        <link rel="canonical" href="https://formmirror.dev" />
        <meta property="og:title" content="FormMirror — Screenshot → Autofill. Instantly." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "FormMirror",
          operatingSystem: "Chrome",
          applicationCategory: "ProductivityApplication",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          description:
            "FormMirror turns completed form screenshots into real keystrokes on any live web form—totally local, private, and framework-safe.",
          url: "https://formmirror.dev",
          creator: {
            "@type": "Organization",
            name: "FormMirror",
            url: "https://formmirror.dev",
          },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "FormMirror",
          url: "https://formmirror.dev",
          sameAs: ["https://github.com/ehfuzzz/formmirror-extension"],
          description:
            "Privacy-first screenshot-to-autofill for teams that care about data sovereignty.",
        })}</script>
        <meta
          property="og:description"
          content="FormMirror turns completed form screenshots into real keystrokes on any live web form—totally local, private, and framework-safe."
        />
      </Helmet>
      <Section className="pt-24" hasGrid>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Screenshot → Autofill</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Screenshot → Autofill. Instantly.
            </h1>
            <p className="mt-6 text-lg text-steel">
              FormMirror turns a completed form screenshot into real keystrokes on any live web form—totally
              local, private, and framework-safe.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button as="a" href={repoUrl} target="_blank" rel="noreferrer">
                Install on Chrome
              </Button>
              <Button as="a" href="#how-it-works" variant="secondary">
                See how it works
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-steel">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                Totally local intelligence
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                Framework-safe events
              </div>
            </div>
          </div>
          <HeroScanner />
        </div>
      </Section>
      <Section background="subtle">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((prop) => (
            <FeatureCard key={prop.title} title={prop.title} description={prop.description} icon={prop.icon} />
          ))}
        </div>
      </Section>
      <Section id="how-it-works">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold text-ink">How it works</h2>
            <p className="mt-4 text-base text-steel">
              Every step respects privacy and accessibility from the start—no servers, no surprises, just
              OCR-driven intelligence running locally in your browser.
            </p>
            <div className="mt-10">
              <Stepper steps={howItWorks} />
            </div>
          </div>
          <div className="space-y-6 rounded-2xl border border-blue-100 bg-white p-8 shadow-md">
            <h3 className="text-xl font-semibold text-ink">Operate in five beats</h3>
            <ul className="space-y-3 text-sm text-steel">
              <li>Install &amp; pin FormMirror in Chrome.</li>
              <li>Open the form you want to mirror.</li>
              <li>Upload or paste your completed form screenshot.</li>
              <li>Review mid-confidence matches and confirm.</li>
              <li>Automate recurring work with Macro Studio.</li>
            </ul>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-6 text-sm text-blue-800">
              <p className="font-semibold">Developer quick start</p>
              <p className="mt-2 font-mono text-xs">npm run dev • npm run build</p>
              <p className="mt-2">Hot reload for building, Chrome-loadable dist for packaging.</p>
            </div>
          </div>
        </div>
      </Section>
      <Section background="subtle">
        <div className="grid gap-6 lg:grid-cols-2">
          {featureDeepDive.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              emphasis="highlight"
            />
          ))}
        </div>
      </Section>
      <Section>
        <div className="rounded-2xl border border-blue-100 bg-white p-10 shadow-md">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold text-ink">Designed for trust-forward teams</h2>
              <p className="mt-4 text-base text-steel">
                FormMirror keeps data on-device, respects complex accessibility patterns, and fits naturally into
                your compliance story. No analytics run unless you explicitly opt in.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-steel">
                <li>WCAG-aligned matching that respects accessible names.</li>
                <li>Strict CSP and offline-first architecture.</li>
                <li>Local storage in chrome.storage.local, never remote servers.</li>
              </ul>
            </div>
            <div className="space-y-4">
              <blockquote className="rounded-xl border border-blue-100 bg-blue-50/60 p-6 text-sm text-blue-900">
                “FormMirror finally lets our operations team trust screenshot handoffs. The review flow makes QA
                painless and the macro history is gold.”
                <footer className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Director of Operations, Series B fintech
                </footer>
              </blockquote>
              <blockquote className="rounded-xl border border-blue-100 bg-white p-6 text-sm text-steel">
                “The ability to keep everything on-device means we can roll this out in regulated environments with
                zero friction.”
                <footer className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  Privacy Lead, enterprise healthcare
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </Section>
      <Section background="subtle">
        <InstallBanner />
      </Section>
    </>
  )
}
