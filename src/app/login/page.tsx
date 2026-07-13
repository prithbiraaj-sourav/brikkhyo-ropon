'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setLoading(true)
    setError('')
    // Store the admin token in localStorage for client-side API calls
    // In production you'd use a proper auth flow (Supabase Auth)
    const res = await fetch('/api/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })
    const data = await res.json()
    if (res.ok && data.ok) {
      if (typeof window !== 'undefined') localStorage.setItem('adminToken', password)
      router.push('/admin')
    } else {
      setError('পাসওয়ার্ড ভুল।')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="card max-w-sm w-full space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forest-500 flex items-center justify-center">
            <span className="text-white">🌿</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">অ্যাডমিন লগইন</h1>
            <p className="text-xs text-gray-500">বৃক্ষ নিধি ড্যাশবোর্ড</p>
          </div>
        </div>
        <div className="space-y-1">
          <label className="label">পাসওয়ার্ড</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <button className="btn-primary w-full" onClick={handleLogin} disabled={loading}>
          {loading ? 'যাচাই হচ্ছে…' : 'প্রবেশ করুন'}
        </button>
        <p className="text-center text-xs text-gray-400">
          <a href="/volunteer" className="text-forest-700 hover:underline">← স্বেচ্ছাসেবক ফর্মে ফিরুন</a>
        </p>
      </div>
    </div>
  )
}
