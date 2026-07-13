import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { MAP_CONFIG } from '@/lib/constants'

// POST /api/trees  — volunteer submits one or more tree species at one spot
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { volunteer_name, phone, department, zone, location_name, notes, latitude, longitude, trees } = body

    // Validate required fields — volunteer name/phone are no longer collected
    if (!department || !zone || !latitude || !longitude || !Array.isArray(trees) || trees.length === 0) {
      return NextResponse.json({ error: 'সব প্রয়োজনীয় তথ্য পূরণ করুন।' }, { status: 400 })
    }

    const cleanedTrees = trees
      .map((t: any) => ({
        tree_name: typeof t?.tree_name === 'string' ? t.tree_name.trim() : '',
        quantity:  parseInt(t?.quantity, 10),
      }))
      .filter((t: { tree_name: string; quantity: number }) => t.tree_name && Number.isFinite(t.quantity) && t.quantity > 0)

    if (cleanedTrees.length === 0) {
      return NextResponse.json({ error: 'অন্তত একটি গাছের নাম ও সংখ্যা দিন।' }, { status: 400 })
    }

    // Validate coordinates within Shariatpur Sadar bounds
    const { bounds } = MAP_CONFIG
    if (
      latitude  < bounds.south || latitude  > bounds.north ||
      longitude < bounds.west  || longitude > bounds.east
    ) {
      return NextResponse.json(
        { error: 'অবস্থান শরীয়তপুর সদর উপজেলার বাইরে।' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('trees')
      .insert(cleanedTrees.map(t => ({
        volunteer_name: volunteer_name?.trim() || null,
        phone:          phone?.trim() || null,
        department:     department.trim(),
        zone,
        tree_name:      t.tree_name,
        quantity:       t.quantity,
        location_name:  location_name?.trim() || null,
        notes:          notes?.trim() || null,
        latitude:       parseFloat(latitude),
        longitude:      parseFloat(longitude),
        status:         'pending',
      })))
      .select('tree_code, id, tree_name, quantity')

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'ডেটা সংরক্ষণে সমস্যা হয়েছে।' }, { status: 500 })
    }

    return NextResponse.json({ success: true, trees: data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'অপ্রত্যাশিত সমস্যা।' }, { status: 500 })
  }
}

// GET /api/trees  — fetch trees for map (verified only, or all for admin with token)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const adminToken = req.headers.get('x-admin-token')
  const isAdmin    = adminToken === process.env.ADMIN_SECRET

  const supabase = getAdminClient()

  let query = supabase
    .from('trees')
    .select('id, tree_code, volunteer_name, department, zone, tree_name, quantity, location_name, notes, latitude, longitude, status, created_at')
    .order('created_at', { ascending: false })

  // Non-admins only see verified trees
  if (!isAdmin) {
    query = query.eq('status', 'verified')
  }

  // Optional filters
  const zone   = searchParams.get('zone')
  const status = searchParams.get('status')
  const limit  = Math.min(parseInt(searchParams.get('limit') || '2000'), 5000)

  if (zone)   query = query.eq('zone', zone)
  if (status && isAdmin) query = query.eq('status', status)

  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'ডেটা পড়তে সমস্যা।' }, { status: 500 })
  }

  return NextResponse.json({ trees: data, count: data?.length ?? 0 })
}
