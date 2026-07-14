'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ZONES, TREE_SUGGESTIONS, MAP_CONFIG } from '@/lib/constants'
import type { Organization } from '@/lib/supabase'

// Leaflet must not SSR
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] w-full rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">
      ম্যাপ লোড হচ্ছে…
    </div>
  ),
})

type TreeEntry = { tree_name: string; quantity: string }

type FormData = {
  department: string
  zone: string
  location_name: string
  notes: string
  latitude: string
  longitude: string
}

type SubmittedTree = { id: string; tree_code: string; tree_name: string; quantity: number }

const INITIAL: FormData = {
  department: '', zone: '', location_name: '', notes: '',
  latitude: '', longitude: '',
}

const EMPTY_TREE_ENTRY: TreeEntry = { tree_name: '', quantity: '1' }

const Field = ({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="label" htmlFor={id}>{label}</label>
    {children}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
)

export default function VolunteerPage() {
  const [form, setForm]       = useState<FormData>(INITIAL)
  const [trees, setTrees]     = useState<TreeEntry[]>([EMPTY_TREE_ENTRY])
  const [errors, setErrors]   = useState<Partial<FormData>>({})
  const [treesError, setTreesError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState<SubmittedTree[] | null>(null)
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

  function handleLocationChange(lat: string, lng: string) {
    setForm(f => ({ ...f, latitude: lat, longitude: lng }))
    setErrors(e => ({ ...e, latitude: undefined }))
  }

  function updateTreeEntry(i: number, key: keyof TreeEntry, value: string) {
    setTrees(list => list.map((t, idx) => idx === i ? { ...t, [key]: value } : t))
  }

  function addTreeEntry() {
    setTrees(list => [...list, { ...EMPTY_TREE_ENTRY }])
  }

  function removeTreeEntry(i: number) {
    setTrees(list => list.length > 1 ? list.filter((_, idx) => idx !== i) : list)
  }

  function validate(): boolean {
    const e: Partial<FormData> = {}
    if (!form.department.trim())     e.department     = 'প্রতিষ্ঠান বেছে নিন'
    if (!form.zone)                  e.zone           = 'এলাকা বেছে নিন'
    if (!form.latitude || !form.longitude) {
      e.latitude = 'ম্যাপে ট্যাপ করে অবস্থান নির্বাচন করুন'
    } else {
      const { bounds } = MAP_CONFIG
      const lat = parseFloat(form.latitude)
      const lng = parseFloat(form.longitude)
      if (lat < bounds.south || lat > bounds.north || lng < bounds.west || lng > bounds.east) {
        e.latitude = 'অবস্থান শরীয়তপুর সদরের বাইরে'
      }
    }
    setErrors(e)

    const treesValid = trees.every(t => t.tree_name.trim() && parseInt(t.quantity, 10) > 0)
    setTreesError(treesValid ? '' : 'প্রতিটি গাছের নাম ও সংখ্যা (কমপক্ষে ১) দিন')

    return Object.keys(e).length === 0 && treesValid
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
          trees: trees.map(t => ({ tree_name: t.tree_name.trim(), quantity: parseInt(t.quantity, 10) })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'সমস্যা হয়েছে।')
        return
      }
      setSubmitted(data.trees)
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
          <div className="bg-forest-50 border border-forest-200 rounded-lg px-4 py-3 text-sm space-y-1.5">
            {submitted.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3">
                <span className="text-gray-600">{t.tree_name} × {t.quantity.toLocaleString('bn')}</span>
                <span className="font-mono font-semibold text-forest-700">{t.tree_code}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">এই কোডগুলো সংরক্ষণ করুন।</p>
          <button className="btn-primary w-full" onClick={() => { setForm(INITIAL); setTrees([{ ...EMPTY_TREE_ENTRY }]); setSubmitted(null) }}>
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

          {/* Tree types + quantities */}
          <div className="space-y-2">
            <label className="label">গাছের ধরন ও সংখ্যা *</label>
            {trees.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input list="treeSuggestions" className="input text-sm flex-1"
                  placeholder="আম, নিম, সেগুন…"
                  value={t.tree_name} onChange={e => updateTreeEntry(i, 'tree_name', e.target.value)} />
                <input type="number" min={1} className="input text-sm w-20"
                  placeholder="সংখ্যা"
                  value={t.quantity} onChange={e => updateTreeEntry(i, 'quantity', e.target.value)} />
                <button type="button" className="text-red-500 text-sm px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => removeTreeEntry(i)} disabled={trees.length === 1}>✕</button>
              </div>
            ))}
            <datalist id="treeSuggestions">
              {TREE_SUGGESTIONS.map(t => (
                <option key={t.name} value={t.name}>{t.scientific}</option>
              ))}
            </datalist>
            <button type="button" className="btn-secondary text-xs" onClick={addTreeEntry}>
              + আরেকটি গাছ যোগ করুন
            </button>
            {treesError && <p className="text-xs text-red-600">{treesError}</p>}
          </div>

          {/* Location pin */}
          <div className="space-y-1">
            <label className="label">গাছের অবস্থান *</label>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={handleLocationChange}
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input className="input text-sm bg-gray-50 text-gray-500" readOnly
                value={form.latitude} placeholder="Latitude" />
              <input className="input text-sm bg-gray-50 text-gray-500" readOnly
                value={form.longitude} placeholder="Longitude" />
            </div>
            {errors.latitude && <p className="text-xs text-red-600">{errors.latitude}</p>}
          </div>

          <Field id="locName" label="অবস্থানের নাম (ঐচ্ছিক)" error={undefined}>
            <input id="locName" className="input" placeholder="যেমনঃ মসজিদের পাশে, বাজারের সামনে"
              value={form.location_name} onChange={set('location_name')} />
          </Field>
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
          * চিহ্নিত ঘর অবশ্যই পূরণ করতে হবে।
        </p>
      </div>
    </div>
  )
}
