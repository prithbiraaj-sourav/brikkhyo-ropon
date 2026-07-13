import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-token') === process.env.ADMIN_SECRET
}

// PATCH /api/trees/:id  — admin verifies or rejects a tree
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'অননুমোদিত।' }, { status: 401 })
  }

  const { status, verified_by } = await req.json()

  if (!['verified', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'অবৈধ স্ট্যাটাস।' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('trees')
    .update({
      status,
      verified_by:  verified_by || 'admin',
      verified_at:  new Date().toISOString(),
    })
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
