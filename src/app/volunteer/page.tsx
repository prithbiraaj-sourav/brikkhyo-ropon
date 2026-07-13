'use client'

import { useEffect, useState } from 'react'
import { ZONES, TREE_SUGGESTIONS, MAP_CONFIG } from '@/lib/constants'
import type { Organization } from '@/lib/supabase'

type FormData = {
  department: string
  zone: string
  tree_name: string
  tree_scientific: string
  notes: string
  latitude: string
  longitude: string
}

const INITIAL: FormData = {
  department: '', zone: '',
  tree_name: '', tree_scientific: '', notes: '',
  latitude: '', longitude: '',
}

const Field = ({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="label" htmlFor={id}>{label}</label>
    {children}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
)

export default function VolunteerPage() {
  const [form, setForm]       = useState<FormData>(INITIAL)
  const [errors, setErrors]   = useState<Partial<FormData>>({})
  const [geoStatus, setGeoStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState<{ tree_code: string } | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgsLoading, setOrgsLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/organizations')
      .then(res => res.json())
      .then(data => setOrganizations(data.organizations || []))
      .finally(() => setOrgsLoading(false))
  }, [])

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function validate(): boolean {
    const e: Partial<FormData> = {}
    if (!form.department.trim())     e.department     = 'প্রতিষ্ঠান বেছে নিন'
    if (!form.zone)                  e.zone           = 'এলাকা বেছে নিন'
    if (!form.tree_name.trim())      e.tree_name      = 'গাছের নাম লিখুন'
    if (!form.latitude)              e.latitude       = 'GPS অবস্থান নিন'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function captureGPS() {
    setGeoStatus({ msg: 'অবস্থান খোঁজা হচ্ছে…', ok: false })
    if (!navigator.geolocation) {
      setGeoStatus({ msg: 'এই ডিভাইসে GPS নেই।', ok: false })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        // Bounds check
        const { bounds } = MAP_CONFIG
        if (
          pos.coords.latitude  < bounds.south || pos.coords.latitude  > bounds.north ||
          pos.coords.longitude < bounds.west  || pos.coords.longitude > bounds.east
        ) {
          setGeoStatus({ msg: '⚠ অবস্থান শরীয়তপুর সদরের বাইরে। ঠিক জায়গায় আছেন কিনা নিশ্চিত করুন।', ok: false })
          return
        }
        setForm(f => ({ ...f, latitude: lat, longitude: lng }))
        setErrors(e => ({ ...e, latitude: undefined }))
        setGeoStatus({ msg: `✓ পাওয়া গেছে — নির্ভুলতা ±${Math.round(pos.coords.accuracy)} মিটার`, ok: true })
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'অনুমতি দেননি — ব্রাউজার সেটিংস থেকে Location চালু করুন।',
          2: 'অবস্থান পাওয়া যাচ্ছে না।',
          3: 'সময় শেষ হয়ে গেছে, আবার চেষ্টা করুন।',
        }
        setGeoStatus({ msg: msgs[err.code] || 'অজানা সমস্যা।', ok: false })
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const res  = await fetch('/api/trees', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          latitude:  parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'সমস্যা হয়েছে।')
        return
      }
      setSubmitted({ tree_code: data.tree_code })
    } catch {
      alert('নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center space-y-4">
          <div className="text-5xl text-forest-500">🌳</div>
          <h2 className="text-xl font-semibold text-forest-700">গাছ সফলভাবে নিবন্ধিত!</h2>
          <p className="text-gray-600">আপনার অবদান মানচিত্রে যুক্ত হবে যাচাইয়ের পর।</p>
          <div className="bg-forest-50 border border-forest-200 rounded-lg px-4 py-3 text-sm">
            <span className="text-gray-500">গাছ আইডি: </span>
            <span className="font-mono font-semibold text-forest-700">{submitted.tree_code}</span>
          </div>
          <p className="text-xs text-gray-400">এই কোডটি সংরক্ষণ করুন।</p>
          <button className="btn-primary w-full" onClick={() => { setForm(INITIAL); setSubmitted(null); setGeoStatus(null) }}>
            আরেকটি গাছ লাগান
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-forest-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl">🌿</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">বৃক্ষরোপণ নিবন্ধন</h1>
            <p className="text-xs text-gray-500">শরীয়তপুর সদর উপজেলা · স্বেচ্ছাসেবক ফর্ম</p>
          </div>
        </div>

        {/* Organization */}
        <div className="card space-y-4">
          <h2 className="text-xs font-semibold text-forest-700 uppercase tracking-wide">প্রতিষ্ঠানের তথ্য</h2>
          <Field id="dept" label="বিভাগ / প্রতিষ্ঠান *" error={errors.department}>
            <select id="dept" className={`input ${errors.department ? 'border-red-400' : ''}`}
              value={form.department} onChange={set('department')} disabled={orgsLoading}>
              <option value="">{orgsLoading ? 'লোড হচ্ছে…' : 'প্রতিষ্ঠান বেছে নিন…'}</option>
              {organizations.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
            {!orgsLoading && organizations.length === 0 && (
              <p className="text-xs text-amber-700">কোনো প্রতিষ্ঠান যোগ করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
            )}
          </Field>
        </div>

        {/* Plantation Info */}
        <div className="card space-y-4">
          <h2 className="text-xs font-semibold text-forest-700 uppercase tracking-wide">রোপণের তথ্য</h2>
          <Field id="zone" label="এলাকা / ইউনিয়ন *" error={errors.zone}>
            <select id="zone" className={`input ${errors.zone ? 'border-red-400' : ''}`}
              value={form.zone} onChange={set('zone')}>
              <option value="">এলাকা বেছে নিন…</option>
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="tree" label="গাছের নাম *" error={errors.tree_name}>
              <input id="tree" list="treeSuggestions" className={`input ${errors.tree_name ? 'border-red-400' : ''}`}
                placeholder="আম, নিম, সেগুন…" value={form.tree_name} onChange={set('tree_name')} />
              <datalist id="treeSuggestions">
                {TREE_SUGGESTIONS.map(t => (
                  <option key={t.name} value={t.name}>{t.scientific}</option>
                ))}
              </datalist>
            </Field>
            <Field id="sci" label="বৈজ্ঞানিক নাম (ঐচ্ছিক)" error={undefined}>
              <input id="sci" className="input" placeholder="Mangifera indica"
                value={form.tree_scientific} onChange={set('tree_scientific')} />
            </Field>
          </div>

          {/* GPS capture */}
          <div className="space-y-1">
            <label className="label">GPS অবস্থান *</label>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-3">
              <button type="button" className="btn-secondary w-full text-sm" onClick={captureGPS}>
                📍 আমার বর্তমান অবস্থান নিন
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="label text-xs">অক্ষাংশ (Lat)</label>
                  <input readOnly className="input text-xs bg-gray-100" placeholder="23.2170" value={form.latitude} />
                </div>
                <div className="space-y-1">
                  <label className="label text-xs">দ্রাঘিমাংশ (Lng)</label>
                  <input readOnly className="input text-xs bg-gray-100" placeholder="90.3500" value={form.longitude} />
                </div>
              </div>
              {geoStatus && (
                <p className={`text-xs ${geoStatus.ok ? 'text-forest-700' : 'text-amber-700'}`}>
                  {geoStatus.msg}
                </p>
              )}
              {errors.latitude && <p className="text-xs text-red-600">{errors.latitude}</p>}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">অতিরিক্ত মন্তব্য (ঐচ্ছিক)</h2>
          <textarea className="input resize-none" rows={3}
            placeholder="মাটির ধরন, রোপণের অবস্থা, পাশের গাছপালা…"
            value={form.notes} onChange={set('notes')} />
        </div>

        <button className="btn-primary w-full text-base py-3" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'সংরক্ষণ হচ্ছে…' : '🌱 বৃক্ষরোপণ নিবন্ধন করুন'}
        </button>
        <p className="text-center text-xs text-gray-400 pb-8">
          * চিহ্নিত ঘর অবশ্যই পূরণ করতে হবে। অবস্থান শুধু মানচিত্রে ব্যবহার হবে।
        </p>
      </div>
    </div>
  )
}
