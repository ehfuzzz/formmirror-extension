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
      'Drag and drop, paste from your clipboard, or browse for a file. FormMirror maps the screenshot to the active page in a few seconds.',
    icon: <Zap className="h-5 w-5" />,
  },
  {
    title: 'Totally local intelligence.',
    description:
      'OCR and matching run entirely in browser with WebAssembly. No uploads, no servers, and no one watching your fields.',
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    title: 'Framework safe autofill.',
    description:
      'Native setters and real input and change events keep React, Vue, Angular, and vanilla forms behaving exactly as if a human typed.',
    icon: <Puzzle className="h-5 w-5" />,
  },
  {
    title: 'Accessible by design.',
    description:
      'A WCAG aligned accessible name algorithm and layout heuristics help the right fields light up even on complex enterprise layouts.',
    icon: <Accessibility className="h-5 w-5" />,
  },
]

const howItWorks = [
  {
    title: 'Upload',
    description: 'Drop a completed form screenshot into FormMirror from drag and drop, paste, or file picker.',
  },
  {
    title: 'Recognize',
    description: 'WebAssembly OCR with smart preprocessing extracts word level data for precise mapping.',
  },
  {
    title: 'Match',
    description: 'Layout, token similarity, and proximity scoring link screenshot labels to live form fields.',
  },
  {
    title: 'Fill',
    description: 'Framework safe events populate fields with smart handling for dates, selects, and contenteditable regions.',
  },
  {
    title: 'Review',
    description: 'Confirm mid confidence matches, skip sensitive inputs, and store selectors locally for future visits.',
  },
]

const featureDeepDive = [
  {
    title: 'Intelligent OCR pipeline.',
    description:
      'WebAssembly powered Tesseract.js with optional contrast and exposure boosts surfaces word level boxes ready for matching.',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: 'Smart matching and filling.',
    description:
      'Multi factor similarity scores decide which fields autofill automatically and which ones move into review while still respecting password and file safety.',
    icon: <Workflow className="h-5 w-5" />,
  },
  {
    title: 'Macro Studio for power users.',
    description:
      'Train reusable macros with region selectors, color filters, and versioned histories. Execution reruns OCR on cropped regions for precision.',
    icon: <ArrowDownRight className="h-5 w-5 rotate-90" />,
  },
  {
    title: 'Privacy and trust.',
    description:
      'No network calls, strict CSP, and rules stored only in chrome.storage.local. Analytics stay opt in and remain off by default.',
    icon: <Lock className="h-5 w-5" />,
  },
]

export default function Home() {
  return (
    <>
      <Helmet>
        <title>FormMirror | Screenshot to autofill in seconds.</title>
        <meta
          name="description"
          content="FormMirror turns a completed form screenshot into real keystrokes on any live web form. Everything runs locally in your browser, so data stays private and framework safe."
        />
        <link rel="canonical" href="https://formmirror.dev" />
        <meta property="og:title" content="FormMirror | Screenshot to autofill in seconds." />
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
            "FormMirror turns a completed form screenshot into real keystrokes on any live web form. Everything runs locally in your browser, so data stays private and framework safe.",
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
            "Privacy first screenshot to autofill for teams that care about data sovereignty.",
        })}</script>
        <meta
          property="og:description"
          content="FormMirror turns a completed form screenshot into real keystrokes on any live web form. Everything runs locally in your browser, so data stays private and framework safe."
        />
      </Helmet>
      <Section className="pt-24" hasGrid>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">SCREENSHOT TO AUTOFILL</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Screenshot to autofill in seconds.
            </h1>
            <p className="mt-6 text-lg text-steel">
              FormMirror turns a completed form screenshot into real keystrokes on any live web form. Everything
              runs locally in your browser, so data stays private and framework safe.
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
                Framework safe events
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
              Every step respects privacy and accessibility from the start. There are no servers and no surprises,
              only OCR driven intelligence that runs locally in your browser.
            </p>
            <div className="mt-10">
              <Stepper steps={howItWorks} />
            </div>
          </div>
          <div className="space-y-6 rounded-2xl border border-blue-100 bg-white p-8 shadow-md">
            <h3 className="text-xl font-semibold text-ink">Operate in five beats.</h3>
            <ul className="space-y-3 text-sm text-steel">
              <li>Install and pin FormMirror in Chrome.</li>
              <li>Open the form you want to mirror.</li>
              <li>Upload or paste your completed form screenshot.</li>
              <li>Review mid confidence matches and confirm.</li>
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
      <Section background="subtle">
        <InstallBanner />
      </Section>
    </>
  )
}
