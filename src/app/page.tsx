import { redirect } from 'next/navigation'

// Root redirects to volunteer form by default
export default function Home() {
  redirect('/volunteer')
}
