'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ZONES, TREE_SUGGESTIONS, TARGET_TREES } from '@/lib/constants'
import type { Tree, Organization } from '@/lib/supabase'
import { buildOrgColorEntries, buildOrgColorMap, OTHER_ORG_COLOR } from '@/lib/orgColors'

// Leaflet must not SSR
const TreeMap = dynamic(() => import('@/components/TreeMap'), { ssr: false })

type TabId = 'overview' | 'map' | 'records' | 'organizations'

type EditForm = {
  department: string
  zone: string
  tree_name: string
  quantity: string
  location_name: string
  notes: string
}

const TabBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${active ? 'border-forest-500 text-forest-700 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
    onClick={onClick}
  >
    {label}
  </button>
)

export default function AdminPage() {
  const router = useRouter()
  const [token, setToken]       = useState('')
  const [tab, setTab]           = useState<TabId>('overview')
  const [trees, setTrees]       = useState<Tree[]>([])
  const [stats, setStats]       = useState<any>(null)
  const [zones, setZones]       = useState<any[]>([])
  const [species, setSpecies]   = useState<any[]>([])
  const [orgSummary, setOrgSummary] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [newOrgName, setNewOrgName]       = useState('')
  const [orgSubmitting, setOrgSubmitting] = useState(false)
  const [orgError, setOrgError]           = useState('')
  const [editingOrgId, setEditingOrgId]     = useState<string | null>(null)
  const [editingOrgName, setEditingOrgName] = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [editingTree, setEditingTree] = useState<Tree | null>(null)
  const [editForm, setEditForm]       = useState<EditForm | null>(null)
  const [editError, setEditError]     = useState('')
  const [editSaving, setEditSaving]   = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = localStorage.getItem('adminToken') || ''
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [router])

  const fetchAll = useCallback(async (t: string) => {
    if (!t) return
    setLoading(true)
    try {
      const [treesRes, statsRes, orgsRes] = await Promise.all([
        fetch('/api/trees', { headers: { 'x-admin-token': t } }),
        fetch('/api/stats', { headers: { 'x-admin-token': t } }),
        fetch('/api/organizations', { headers: { 'x-admin-token': t } }),
      ])
      if (treesRes.status === 401 || statsRes.status === 401) {
        if (typeof window !== 'undefined') localStorage.removeItem('adminToken')
        router.push('/login')
        return
      }
      const td = await treesRes.json()
      const sd = await statsRes.json()
      const od = await orgsRes.json()
      setTrees(td.trees || [])
      setStats(sd.stats)
      setZones(sd.zones || [])
      setSpecies(sd.species || [])
      setOrgSummary(sd.orgSummary || [])
      setOrganizations(od.organizations || [])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { if (token) fetchAll(token) }, [token, fetchAll])

  function openEdit(t: Tree) {
    setEditingTree(t)
    setEditForm({
      department:    t.department,
      zone:          t.zone,
      tree_name:     t.tree_name,
      quantity:      String(t.quantity),
      location_name: t.location_name || '',
      notes:         t.notes || '',
    })
    setEditError('')
  }

  function closeEdit() {
    setEditingTree(null)
    setEditForm(null)
  }

  async function saveEdit() {
    if (!editingTree || !editForm) return
    if (!editForm.department.trim() || !editForm.zone || !editForm.tree_name.trim() || parseInt(editForm.quantity, 10) <= 0) {
      setEditError('সব প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন।')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/trees/${editingTree.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body:    JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'সমস্যা হয়েছে।')
        return
      }
      closeEdit()
      fetchAll(token)
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteTree(id: string) {
    if (!window.confirm('এই রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?')) return
    await fetch(`/api/trees/${id}`, {
      method:  'DELETE',
      headers: { 'x-admin-token': token },
    })
    fetchAll(token)
  }

  async function addOrganization() {
    if (!newOrgName.trim()) return
    setOrgSubmitting(true)
    setOrgError('')
    try {
      const res = await fetch('/api/organizations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body:    JSON.stringify({ name: newOrgName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOrgError(data.error || 'সমস্যা হয়েছে।')
        return
      }
      setNewOrgName('')
      fetchAll(token)
    } finally {
      setOrgSubmitting(false)
    }
  }

  async function deleteOrganization(id: string) {
    if (!window.confirm('এই প্রতিষ্ঠানটি মুছে ফেলতে চান?')) return
    await fetch(`/api/organizations/${id}`, {
      method:  'DELETE',
      headers: { 'x-admin-token': token },
    })
    fetchAll(token)
  }

  function startEditOrg(o: Organization) {
    setEditingOrgId(o.id)
    setEditingOrgName(o.name)
    setOrgError('')
  }

  function cancelEditOrg() {
    setEditingOrgId(null)
    setEditingOrgName('')
  }

  async function saveEditOrg() {
    if (!editingOrgId || !editingOrgName.trim()) return
    setOrgSubmitting(true)
    setOrgError('')
    try {
      const res = await fetch(`/api/organizations/${editingOrgId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body:    JSON.stringify({ name: editingOrgName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOrgError(data.error || 'সমস্যা হয়েছে।')
        return
      }
      cancelEditOrg()
      fetchAll(token)
    } finally {
      setOrgSubmitting(false)
    }
  }

  const filteredTrees = trees.filter(t => {
    if (filterZone && t.zone !== filterZone) return false
    if (search && ![t.volunteer_name, t.department, t.tree_name, t.zone, t.tree_code]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  // Colors are assigned in organization creation order (not name, not count)
  // so a color never shifts when an org is renamed or the view is filtered.
  const orgColorMap = useMemo(() => {
    const sorted = [...organizations].sort((a, b) => a.created_at.localeCompare(b.created_at))
    return buildOrgColorMap(sorted.map(o => o.name))
  }, [organizations])

  const legend = useMemo(() => {
    const present = new Set(filteredTrees.map(t => t.department))
    const sorted = [...organizations].sort((a, b) => a.created_at.localeCompare(b.created_at))
    const known = buildOrgColorEntries(sorted.map(o => o.name)).filter(e => present.has(e.name))
    const hasOther = Array.from(present).some(name => (orgColorMap[name] || OTHER_ORG_COLOR) === OTHER_ORG_COLOR)
    return { known, hasOther }
  }, [filteredTrees, organizations, orgColorMap])

  const progress = stats ? Math.round((stats.total / TARGET_TREES) * 100) : 0

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">লোড হচ্ছে…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-forest-500 flex items-center justify-center">
            <span className="text-white text-sm">🌿</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold">বৃক্ষ নিধি অ্যাডমিন</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-forest-500 animate-pulse" />
              শরীয়তপুর সদর উপজেলা
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => fetchAll(token)}>↻ রিফ্রেশ</button>
          <button className="text-xs text-gray-400 hover:text-gray-700 px-2"
            onClick={() => { if (typeof window !== 'undefined') localStorage.removeItem('adminToken'); router.push('/login') }}>
            লগআউট
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto">
        <TabBtn label="সারসংক্ষেপ"  active={tab === 'overview'}      onClick={() => setTab('overview')} />
        <TabBtn label="মানচিত্র"    active={tab === 'map'}           onClick={() => setTab('map')} />
        <TabBtn label="রেকর্ড"      active={tab === 'records'}       onClick={() => setTab('records')} />
        <TabBtn label="প্রতিষ্ঠান"  active={tab === 'organizations'} onClick={() => setTab('organizations')} />
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'মোট রোপিত', value: (stats?.total ?? 0).toLocaleString('bn'), sub: `${TARGET_TREES.toLocaleString('bn')} লক্ষ্যের মধ্যে` },
              { label: 'প্রতিষ্ঠান', value: (stats?.organizations ?? 0).toLocaleString('bn'), sub: 'অংশগ্রহণকারী' },
              { label: 'প্রজাতি',    value: (stats?.species ?? 0).toLocaleString('bn'), sub: 'বিভিন্ন প্রজাতি' },
              { label: 'এলাকা',      value: (stats?.zones ?? 0).toLocaleString('bn'), sub: 'ইউনিয়ন/পৌরসভা' },
            ].map(c => (
              <div key={c.label} className="stat-card">
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className="text-2xl font-semibold text-forest-700">{c.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="card space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">সামগ্রিক অগ্রগতি</span>
              <span className="font-semibold text-forest-700">{progress}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-forest-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>বাকি {(TARGET_TREES - (stats?.total ?? 0)).toLocaleString('bn')} টি</span>
              <span>লক্ষ্য: {TARGET_TREES.toLocaleString('bn')} টি</span>
            </div>
          </div>

          {/* Zone breakdown */}
          <div className="card space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ইউনিয়নভিত্তিক রোপণ</h3>
            {zones.slice(0, 12).map((z: any) => {
              const pct = stats?.total ? Math.round((z.total / stats.total) * 100) : 0
              return (
                <div key={z.zone} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600 w-44 flex-shrink-0 text-xs">{z.zone}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-forest-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{z.total.toLocaleString('bn')}</span>
                </div>
              )
            })}
          </div>

          {/* Organization breakdown */}
          <div className="card space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">প্রতিষ্ঠানভিত্তিক রোপণ</h3>
            {orgSummary.slice(0, 12).map((o: any) => {
              const pct = stats?.total ? Math.round((o.total / stats.total) * 100) : 0
              return (
                <div key={o.department} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600 w-44 flex-shrink-0 text-xs truncate">{o.department}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-forest-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{o.total.toLocaleString('bn')}</span>
                </div>
              )
            })}
            {orgSummary.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">কোনো তথ্য নেই।</p>
            )}
          </div>

          {/* Species top 10 */}
          <div className="card space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">শীর্ষ প্রজাতি</h3>
            {species.slice(0, 10).map((s: any, i: number) => (
              <div key={s.tree_name} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                <span className="text-gray-700 flex-1">{s.tree_name}</span>
                <span className="text-xs text-gray-500">{s.total.toLocaleString('bn')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAP ── */}
      {tab === 'map' && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 112px)' }}>
          {/* Zone filter pills */}
          <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
            <button
              className={`text-xs px-3 py-1 rounded-full border transition-colors flex-shrink-0 ${!filterZone ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-gray-200 text-gray-500'}`}
              onClick={() => setFilterZone('')}
            >সব এলাকা</button>
            {ZONES.map(z => (
              <button key={z}
                className={`text-xs px-3 py-1 rounded-full border transition-colors flex-shrink-0 ${filterZone === z ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-gray-200 text-gray-500'}`}
                onClick={() => setFilterZone(filterZone === z ? '' : z)}
              >{z.replace(' ইউনিয়ন', '').replace(' পৌরসভা', '')}</button>
            ))}
          </div>
          {/* Map legend */}
          <div className="relative flex-1">
            <TreeMap trees={filteredTrees} filterZone={filterZone || undefined} orgColors={orgColorMap} />
            <div className="absolute bottom-4 left-4 bg-white border border-gray-100 rounded-lg p-2.5 z-10 text-xs shadow-sm max-h-64 overflow-y-auto max-w-[200px]">
              <p className="text-gray-400 font-semibold mb-1.5">প্রতিষ্ঠান অনুযায়ী রং</p>
              <p className="text-gray-400 mb-1.5">আকার = গাছের সংখ্যা</p>
              <div className="space-y-1">
                {legend.known.map(o => (
                  <div key={o.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: o.color }} />
                    <span className="text-gray-600 truncate">{o.name}</span>
                  </div>
                ))}
                {legend.hasOther && (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: OTHER_ORG_COLOR }} />
                    <span className="text-gray-600">অন্যান্য</span>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute top-4 right-4 bg-white border border-gray-100 rounded-lg px-3 py-1.5 z-10 text-xs shadow-sm">
              {filteredTrees.length.toLocaleString('bn')} টি এন্ট্রি দেখানো হচ্ছে
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDS ── */}
      {tab === 'records' && (
        <div className="max-w-6xl mx-auto p-4 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="input max-w-xs text-sm"
              placeholder="প্রতিষ্ঠান, গাছ বা আইডি দিয়ে খুঁজুন…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="input w-auto text-sm" value={filterZone} onChange={e => setFilterZone(e.target.value)}>
              <option value="">সব এলাকা</option>
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <span className="text-xs text-gray-400 ml-auto">{filteredTrees.length.toLocaleString('bn')} টি ফলাফল</span>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-left">
                  {['আইডি', 'বিভাগ', 'গাছ', 'সংখ্যা', 'এলাকা', 'তারিখ', 'অ্যাকশন'].map(h => (
                    <th key={h} className="px-3 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTrees.slice(0, 200).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{t.tree_code}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{t.department}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{t.tree_name}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{t.quantity.toLocaleString('bn')}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{t.zone}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button className="text-xs text-forest-700 hover:underline" onClick={() => openEdit(t)}>✎ সম্পাদনা</button>
                        <button className="text-xs text-red-500 hover:underline" onClick={() => deleteTree(t.id)}>🗑 মুছুন</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTrees.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">কোনো রেকর্ড পাওয়া যায়নি।</p>
            )}
          </div>
        </div>
      )}

      {/* ── ORGANIZATIONS ── */}
      {tab === 'organizations' && (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="card space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">নতুন প্রতিষ্ঠান যোগ করুন</h3>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="প্রতিষ্ঠানের নাম"
                value={newOrgName}
                onChange={e => setNewOrgName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOrganization()}
              />
              <button className="btn-primary text-sm px-4" onClick={addOrganization} disabled={orgSubmitting || !newOrgName.trim()}>
                যোগ করুন
              </button>
            </div>
            {orgError && <p className="text-xs text-red-600">{orgError}</p>}
          </div>

          <div className="card p-0 divide-y divide-gray-50">
            {organizations.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">কোনো প্রতিষ্ঠান যোগ করা হয়নি।</p>
            )}
            {organizations.map(o => (
              <div key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm gap-2">
                {editingOrgId === o.id ? (
                  <>
                    <input
                      className="input text-sm flex-1"
                      value={editingOrgName}
                      onChange={e => setEditingOrgName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEditOrg()}
                      autoFocus
                    />
                    <button className="text-xs text-forest-700 hover:underline" onClick={saveEditOrg} disabled={orgSubmitting || !editingOrgName.trim()}>সংরক্ষণ</button>
                    <button className="text-xs text-gray-400 hover:underline" onClick={cancelEditOrg}>বাতিল</button>
                  </>
                ) : (
                  <>
                    <span className="text-gray-700 flex-1">{o.name}</span>
                    <button className="text-xs text-forest-700 hover:underline" onClick={() => startEditOrg(o)}>✎ সম্পাদনা</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => deleteOrganization(o.id)}>মুছুন</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EDIT RECORD MODAL ── */}
      {editingTree && editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-forest-700">রেকর্ড সম্পাদনা — {editingTree.tree_code}</h3>

            <div className="space-y-1">
              <label className="label text-xs">প্রতিষ্ঠান</label>
              <select className="input text-sm" value={editForm.department}
                onChange={e => setEditForm(f => f && { ...f, department: e.target.value })}>
                <option value={editForm.department}>{editForm.department}</option>
                {organizations.filter(o => o.name !== editForm.department).map(o => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="label text-xs">এলাকা</label>
                <select className="input text-sm" value={editForm.zone}
                  onChange={e => setEditForm(f => f && { ...f, zone: e.target.value })}>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label text-xs">সংখ্যা</label>
                <input type="number" min={1} className="input text-sm" value={editForm.quantity}
                  onChange={e => setEditForm(f => f && { ...f, quantity: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="label text-xs">গাছের নাম</label>
              <input list="editTreeSuggestions" className="input text-sm" value={editForm.tree_name}
                onChange={e => setEditForm(f => f && { ...f, tree_name: e.target.value })} />
              <datalist id="editTreeSuggestions">
                {TREE_SUGGESTIONS.map(t => <option key={t.name} value={t.name}>{t.scientific}</option>)}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="label text-xs">অবস্থানের নাম (ঐচ্ছিক)</label>
              <input className="input text-sm" value={editForm.location_name}
                onChange={e => setEditForm(f => f && { ...f, location_name: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="label text-xs">মন্তব্য (ঐচ্ছিক)</label>
              <textarea className="input text-sm resize-none" rows={2} value={editForm.notes}
                onChange={e => setEditForm(f => f && { ...f, notes: e.target.value })} />
            </div>

            {editError && <p className="text-xs text-red-600">{editError}</p>}

            <div className="flex gap-2">
              <button className="btn-primary flex-1 text-sm" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ করুন'}
              </button>
              <button className="btn-secondary flex-1 text-sm" onClick={closeEdit} disabled={editSaving}>
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
