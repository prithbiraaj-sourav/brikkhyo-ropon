import type { Metadata } from 'next'
import { Noto_Sans_Bengali } from 'next/font/google'
import './globals.css'

const bangla = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
  variable: '--font-bangla',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'বৃক্ষ নিধি — শরীয়তপুর সদর',
  description: 'শরীয়তপুর সদর উপজেলায় বৃক্ষরোপণ অভিযানের নিবন্ধন ও পর্যবেক্ষণ ব্যবস্থা',
  keywords: ['বৃক্ষরোপণ', 'শরীয়তপুর', 'গাছ', 'পরিবেশ'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className={`${bangla.variable} font-bangla bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  )
}
