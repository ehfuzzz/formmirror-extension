import { motion } from 'framer-motion'

export function HeroScanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100" aria-hidden />
      <div className="relative grid gap-6 p-8 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-blue-200 bg-white/90 p-6 shadow-md"
        >
          <p className="text-sm font-semibold text-blue-700">Drop a screenshot</p>
          <div className="mt-4 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-6 text-center text-blue-700">
            <p className="font-semibold">invoice-final.png</p>
            <p className="text-xs text-blue-800/70">Analyzing fields…</p>
          </div>
          <motion.div
            className="mt-6 space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.2,
                },
              },
            }}
          >
            {['Name', 'Email', 'Company', 'Phone'].map((field) => (
              <motion.div
                key={field}
                variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
                className="flex items-center justify-between rounded-xl border border-blue-100 bg-white/80 px-4 py-3 text-sm text-steel"
              >
                <span>{field}</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  matched
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative rounded-2xl border border-blue-200 bg-white/90 p-6 shadow-md"
        >
          <p className="text-sm font-semibold text-blue-700">Live form</p>
          <div className="mt-4 space-y-4">
            {['Name', 'Email', 'Company', 'Phone'].map((field, idx) => (
              <div key={field}>
                <label className="text-xs font-semibold uppercase tracking-wide text-steel">{field}</label>
                <motion.input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm text-ink shadow-sm focus:border-blue-300 focus:outline-none"
                  initial={{ backgroundPosition: '0% 50%' }}
                  animate={{
                    backgroundColor: ['#FFFFFF', '#EFF7FF', '#FFFFFF'],
                  }}
                  transition={{
                    duration: 2,
                    delay: idx * 0.2,
                    repeat: Infinity,
                    repeatDelay: 5,
                  }}
                  value={['Taylor Reed', 'taylor@folio.dev', 'Folio Labs', '+1 (555) 201-4488'][idx]}
                  readOnly
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 text-xs text-steel">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
            Framework-safe events replayed locally
          </div>
        </motion.div>
      </div>
    </div>
  )
}
