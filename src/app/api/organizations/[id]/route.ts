import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-token') === process.env.ADMIN_SECRET
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
