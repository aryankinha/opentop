import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Terminal, 
  Smartphone, 
  Shield, 
  Zap, 
  Cloud,
  ArrowRight,
  Check,
  Copy,
  Github,
  QrCode,
  Wifi
} from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'One command to start. No configuration needed.'
  },
  {
    icon: Shield,
    title: 'Secure Pairing',
    description: '6-digit PIN ensures only you can connect.'
  },
  {
    icon: Cloud,
    title: 'No Cloud Required',
    description: 'Everything runs on your machine. Your data stays yours.'
  },
  {
    icon: Wifi,
    title: 'Access Anywhere',
    description: 'Connect from any device on any network.'
  }
]

const steps = [
  {
    number: '01',
    title: 'Install the CLI',
    code: 'npm install -g opentop',
    description: 'Install OpenTop globally on your Mac'
  },
  {
    number: '02',
    title: 'Start the server',
    code: 'opentop start --tunnel',
    description: 'Starts your AI agent with public access'
  },
  {
    number: '03',
    title: 'Scan & Connect',
    code: null,
    description: 'Scan the QR code from your phone to connect instantly'
  }
]

export default function LandingPage({ onGetStarted }) {
  const [copiedIndex, setCopiedIndex] = useState(null)

  const copyCode = async (code, index) => {
    await navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">OT</span>
            </div>
            <span className="font-semibold">OpenTop</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/opentop/opentop" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-400 transition-colors text-sm"
            >
              Connect
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm mb-8">
              <Zap className="w-4 h-4" />
              <span>Self-hosted AI, anywhere</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
              Turn Your Mac Into a
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"> Smart AI Server</span>
            </h1>

            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              Run your own AI agent locally and access it from your phone. 
              No cloud, no subscriptions, full control.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-sm">
                <Terminal className="w-4 h-4 text-zinc-500" />
                <span className="text-zinc-300">npm install -g opentop</span>
                <button
                  onClick={() => copyCode('npm install -g opentop', -1)}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors ml-2"
                >
                  {copiedIndex === -1 ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
              </div>
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-colors"
              >
                Connect Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Demo Visual */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-3xl" />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-zinc-500 text-sm font-mono">Terminal</span>
              </div>
              <div className="font-mono text-sm space-y-2">
                <p className="text-zinc-500">$ opentop start --tunnel</p>
                <p className="text-white">╔════════════════════════════════════════════╗</p>
                <p className="text-white">║     OpenTop Agent Server  v0.1.0          ║</p>
                <p className="text-white">╚════════════════════════════════════════════╝</p>
                <p className="text-green-400">✓ Local:   http://localhost:3000</p>
                <p className="text-green-400">✓ Tunnel:  https://xyz.trycloudflare.com</p>
                <p className="text-amber-400">🔐 Pairing PIN: 839201</p>
                <p className="text-zinc-500 mt-4">Scan the QR code or enter the PIN on your phone</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-zinc-400">Three simple steps to get started</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full">
                  <span className="text-5xl font-bold text-zinc-800">{step.number}</span>
                  <h3 className="text-xl font-semibold mt-4 mb-2">{step.title}</h3>
                  <p className="text-zinc-400 text-sm mb-4">{step.description}</p>
                  {step.code ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg font-mono text-sm">
                      <span className="text-amber-500">$</span>
                      <span className="text-zinc-300 flex-1">{step.code}</span>
                      <button
                        onClick={() => copyCode(step.code, index)}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-zinc-500" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2 bg-zinc-800 rounded-lg">
                      <QrCode className="w-8 h-8 text-amber-500" />
                      <div>
                        <p className="text-sm text-white">Scan QR Code</p>
                        <p className="text-xs text-zinc-500">Or enter PIN manually</p>
                      </div>
                    </div>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-zinc-700" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why OpenTop?</h2>
            <p className="text-zinc-400">Everything you need, nothing you don't</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-8 sm:p-12"
          >
            <Smartphone className="w-12 h-12 text-amber-500 mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-zinc-400 mb-8">
              Install the CLI on your Mac and connect from your phone in under a minute.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-colors"
              >
                Connect Your Device
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="https://github.com/opentop/opentop"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">OT</span>
            </div>
            <span>OpenTop</span>
          </div>
          <p>Self-hosted AI agent for everyone</p>
          <a 
            href="https://github.com/opentop/opentop" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
