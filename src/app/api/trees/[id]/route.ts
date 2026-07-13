import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-token') === process.env.ADMIN_SECRET
}

// PATCH /api/trees/:id  — admin edits a record's details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'অননুমোদিত।' }, { status: 401 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.department   !== undefined) updates.department   = String(body.department).trim()
  if (body.zone          !== undefined) updates.zone          = body.zone
  if (body.tree_name     !== undefined) updates.tree_name     = String(body.tree_name).trim()
  if (body.location_name !== undefined) updates.location_name = body.location_name?.trim() || null
  if (body.notes         !== undefined) updates.notes         = body.notes?.trim() || null

  if (body.quantity !== undefined) {
    const quantity = parseInt(body.quantity, 10)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'সংখ্যা সঠিক নয়।' }, { status: 400 })
    }
    updates.quantity = quantity
  }

  if ((updates.department !== undefined && !updates.department) ||
      (updates.tree_name  !== undefined && !updates.tree_name)) {
    return NextResponse.json({ error: 'সব প্রয়োজনীয় তথ্য পূরণ করুন।' }, { status: 400 })
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'কোনো পরিবর্তন নেই।' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('trees')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'আপডেট ব্যর্থ হয়েছে।' }, { status: 500 })
  }

  return NextResponse.json({ success: true, tree: data })
}

// DELETE /api/trees/:id  — admin deletes a tree record
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'অননুমোদিত।' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase.from('trees').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'মুছতে ব্যর্থ হয়েছে।' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
