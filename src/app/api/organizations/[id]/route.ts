import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-token') === process.env.ADMIN_SECRET
}

// PATCH /api/organizations/:id — admin renames an organization
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
      .update({ name: name.trim() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'এই নামে প্রতিষ্ঠান আগে থেকেই আছে।' }, { status: 409 })
      }
      return NextResponse.json({ error: 'হালনাগাদ ব্যর্থ হয়েছে।' }, { status: 500 })
    }

    return NextResponse.json({ organization: data })
  } catch {
    return NextResponse.json({ error: 'অপ্রত্যাশিত সমস্যা।' }, { status: 400 })
  }
}

// DELETE /api/organizations/:id — admin removes an organization
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'অননুমোদিত।' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase.from('organizations').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'মুছতে ব্যর্থ হয়েছে।' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
