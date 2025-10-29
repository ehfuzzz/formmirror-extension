import { motion } from 'framer-motion'

interface Step {
  title: string
  description: string
}

interface StepperProps {
  steps: Step[]
}

export function Stepper({ steps }: StepperProps) {
  return (
    <ol className="grid gap-6 md:grid-cols-2">
      {steps.map((step, index) => (
        <motion.li
          key={step.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          className="relative rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {index + 1}
            </span>
            <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
          </div>
          <p className="mt-3 text-sm text-steel">{step.description}</p>
        </motion.li>
      ))}
    </ol>
  )
}
