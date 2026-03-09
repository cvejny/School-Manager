import { useState, useRef } from 'react'
import { GraduationCap, Mail, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    if (!captchaToken) {
      setError('Prosím potvrď, že nejsi robot.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (tab === 'login') {
      const { error } = await signIn(email, password, captchaToken)
      if (error) setError(error)
    } else {
      const { error, needsConfirmation } = await signUp(email, password, captchaToken)
      if (error) setError(error)
      else if (needsConfirmation) {
        setSuccess('Účet vytvořen! Zkontroluj svůj email a potvrď registraci.')
      }
      // if no error and no needsConfirmation, AuthContext will auto-login
    }
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-3xl flex items-center justify-center shadow-xl shadow-primary-200 dark:shadow-primary-900/30 mx-auto mb-4">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Manager</h1>
          <p className="text-gray-400 mt-1 text-sm">Spravuj školu chytře a přehledně</p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
            <button
              onClick={() => { setTab('login'); setError(null); setSuccess(null) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === 'login' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'
              }`}
            >
              Přihlášení
            </button>
            <button
              onClick={() => { setTab('register'); setError(null); setSuccess(null) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === 'register' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'
              }`}
            >
              Registrace
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="tvuj@email.cz"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Heslo</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder={tab === 'register' ? 'Minimálně 6 znaků' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
                <CheckCircle2 size={15} className="flex-shrink-0" />
                {success}
              </div>
            )}

            <div className="flex justify-center">
              <HCaptcha
                ref={captchaRef}
                sitekey={HCAPTCHA_SITE_KEY}
                onVerify={token => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5"
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {tab === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Data jsou uložena bezpečně v cloudu (Supabase)
        </p>
      </div>
    </div>
  )
}
