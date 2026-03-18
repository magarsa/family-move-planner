import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

interface Props {
  authError?: string | null
}

export default function Login({ authError }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleSignIn() {
    setLoading(true)
    setError('')
    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (authErr) {
      setError(authErr.message)
      setLoading(false)
    }
    // On success, browser redirects to Google — no further state needed
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm text-center"
      >
        <div className="mb-8">
          <div className="text-5xl mb-4">🏡</div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">Move Planner</h1>
          <p className="text-stone-500 text-base leading-relaxed">Your family relocation command center</p>
          <div className="mt-3 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        </div>

        <div className="card p-8">
          {(authError || error) && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {authError || error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 hover:border-stone-300 disabled:opacity-60 transition-all"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? 'Redirecting…' : 'Sign in with Google'}
          </button>

          <p className="mt-5 text-xs text-stone-400">
            Access is restricted to family members only.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
