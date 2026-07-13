import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-token') === process.env.ADMIN_SECRET
}

// GET /api/organizations — public list for the volunteer form's dropdown
export async function GET() {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'তালিকা পড়তে সমস্যা।' }, { status: 500 })
  }

  return NextResponse.json({ organizations: data })
}

// POST /api/organizations — admin adds a new organization
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'অননুমোদিত।' }, { status: 401 })
  }

  try {
    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'প্রতিষ্ঠানের নাম আবশ্যক।' }, { status: 400 })
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'এই প্রতিষ্ঠান আগে থেকেই তালিকায় আছে।' }, { status: 409 })
      }
      return NextResponse.json({ error: 'যোগ করতে সমস্যা হয়েছে।' }, { status: 500 })
    }

    return NextResponse.json({ organization: data })
  } catch {
    return NextResponse.json({ error: 'অপ্রত্যাশিত সমস্যা।' }, { status: 400 })
  }
}
