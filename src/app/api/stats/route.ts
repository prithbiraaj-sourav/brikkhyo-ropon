import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export const revalidate = 60 // cache for 60 seconds

export async function GET(req: NextRequest) {
  const adminToken = req.headers.get('x-admin-token')
  const isAdmin    = adminToken === process.env.ADMIN_SECRET

  if (!isAdmin) {
    return NextResponse.json({ error: 'অননুমোদিত।' }, { status: 401 })
  }

  const supabase = getAdminClient()

  const [statsRes, zoneRes, speciesRes, dailyRes, orgRes] = await Promise.all([
    supabase.from('tree_stats').select('*').single(),
    supabase.from('zone_summary').select('*'),
    supabase.from('species_summary').select('*'),
    supabase.from('daily_counts').select('*'),
    supabase.from('organization_summary').select('*'),
  ])

  if (statsRes.error || zoneRes.error || speciesRes.error || orgRes.error) {
    return NextResponse.json({ error: 'পরিসংখ্যান লোড ব্যর্থ।' }, { status: 500 })
  }

  return NextResponse.json({
    stats:      statsRes.data,
    zones:      zoneRes.data,
    species:    speciesRes.data,
    daily:      dailyRes.data,
    orgSummary: orgRes.data,
  })
}
