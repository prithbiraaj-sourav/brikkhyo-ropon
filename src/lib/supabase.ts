import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — uses anon key, respects RLS
export const supabase = createClient(url, anon)

// Server-side admin client — bypasses RLS, never expose to browser
export function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type Tree = {
  id: string
  tree_code: string
  volunteer_name?: string
  phone?: string
  department: string
  zone: string
  tree_name: string
  tree_scientific?: string
  quantity: number
  location_name?: string
  notes?: string
  latitude: number
  longitude: number
  status: 'pending' | 'verified' | 'rejected'
  verified_by?: string
  verified_at?: string
  created_at: string
}

export type Organization = {
  id: string
  name: string
  created_at: string
}

export type Stats = {
  total: number
  verified: number
  pending: number
  organizations: number
  species: number
  zones: number
}
