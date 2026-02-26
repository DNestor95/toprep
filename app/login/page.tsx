'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSupabaseEnv } from '@/lib/supabase/env'

export default function Login() {
  const { isConfigured } = getSupabaseEnv()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = isConfigured ? createClient() : null
  const router = useRouter()

  React.useEffect(() => {
    if (!supabase) return

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      }
    }

    checkSession()
  }, [router, supabase])

  const getFriendlyAuthError = (errorMessage: string) => {
    const lower = errorMessage.toLowerCase()

    if (lower.includes('invalid login credentials')) {
      return 'Invalid email or password. Please try again.'
    }

    if (lower.includes('email not confirmed')) {
      return 'Your email is not confirmed yet. Please check your inbox for the confirmation link.'
    }

    if (lower.includes('too many requests')) {
      return 'Too many login attempts. Please wait a minute and try again.'
    }

    return errorMessage
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-gray-900">Supabase Setup Required</h1>
          <p className="text-sm text-gray-600">
            Create a <strong>.env.local</strong> file from <strong>.env.local.example</strong> and set your Supabase values.
          </p>
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
            <p>NEXT_PUBLIC_SUPABASE_URL=...</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (!supabase) return

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(getFriendlyAuthError(error.message))
      } else {
        setMessage('Login successful! Redirecting...')
        if (data.session) {
          window.location.assign('/dashboard')
          return
        }

        setMessage('Login succeeded but no session was returned. Please try again.')
      }
    } catch (err) {
      setMessage('Unexpected error occurred. Please try again.')
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (!supabase) return

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setMessage(getFriendlyAuthError(error.message))
      } else if (data.user && !data.session) {
        setMessage('Please check your email to confirm your account.')
      } else if (data.session) {
        setMessage('Account created successfully! Redirecting...')
        window.location.assign('/dashboard')
        return
      }
    } catch (err) {
      setMessage('Unexpected error occurred. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sales Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                required
              />
            </div>
          </div>

          {message && (
            <div className="text-center text-sm text-red-600">
              {message}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}