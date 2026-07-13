// Seeds dummy tree records via the local dev API so the admin panel can be
// exercised without physically being in Shariatpur Sadar to pin a location.
//
// Usage: node scripts/seed-dummy-trees.mjs [count]
// Requires the dev server running (npm run dev) and .env.local populated.
// `count` is the number of submissions (each submission lists 1-3 tree
// species with a quantity, matching the volunteer form's shape).

import { readFileSync } from 'node:fs'

const BASE_URL = process.env.APP_URL || 'http://localhost:3000'
const COUNT = parseInt(process.argv[2] || '120', 10)

function loadEnvLocal() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

const env = loadEnvLocal()
const ADMIN_SECRET = env.ADMIN_SECRET
if (!ADMIN_SECRET) {
  console.error('ADMIN_SECRET not found in .env.local')
  process.exit(1)
}

const ZONES = [
  'শরীয়তপুর পৌরসভা', 'অঙ্গারিয়া ইউনিয়ন', 'বিনোদপুর ইউনিয়ন', 'চন্দ্রপুর ইউনিয়ন',
  'চিকান্দি ইউনিয়ন', 'চিতালিয়া ইউনিয়ন', 'ডোমসার ইউনিয়ন', 'মাহমুদপুর ইউনিয়ন',
  'পালং ইউনিয়ন', 'রুদ্রকর ইউনিয়ন', 'শাউলপাড়া ইউনিয়ন', 'তুলাসার ইউনিয়ন',
]

const TREES = [
  'সেগুন', 'নিম', 'আম', 'কাঁঠাল', 'বাঁশ', 'অর্জুন', 'রেইনট্রি', 'কৃষ্ণচূড়া',
  'নারকেল', 'হিজল', 'করই', 'শিমুল', 'মেহগনি', 'জাম', 'লিচু', 'পেয়ারা', 'তাল', 'খেজুর',
]

const DEPARTMENTS = [
  'পরিবেশ অধিদপ্তর', 'শরীয়তপুর সদর উপজেলা পরিষদ', 'সরকারি বিদ্যালয়', 'স্থানীয় যুব সংগঠন',
  'বন বিভাগ', 'রেড ক্রিসেন্ট সোসাইটি', 'বেসরকারি উন্নয়ন সংস্থা', 'কৃষি সম্প্রসারণ অধিদপ্তর',
]

const LOCATION_NAMES = [
  '', '', '', 'মসজিদের পাশে', 'বাজারের সামনে', 'বিদ্যালয় মাঠে', 'পুকুর পাড়ে', 'রাস্তার ধারে',
]

const NOTES = [
  '', '', '', 'মাটি উর্বর, ভালো বৃদ্ধি আশা করা যায়।', 'রাস্তার পাশে রোপণ করা হয়েছে।',
  'বিদ্যালয় প্রাঙ্গণে রোপিত।', 'বর্ষার শুরুতে রোপণ করা হয়েছে।', 'পুকুর পাড়ে রোপিত।',
]

// Shariatpur Sadar bounds (must stay within these or the API rejects it)
const BOUNDS = { south: 23.05, north: 23.30, west: 90.10, east: 90.35 }

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)) }
function randCoord() {
  return {
    latitude:  (BOUNDS.south + Math.random() * (BOUNDS.north - BOUNDS.south)).toFixed(6),
    longitude: (BOUNDS.west  + Math.random() * (BOUNDS.east  - BOUNDS.west)).toFixed(6),
  }
}

function randomTreeEntries() {
  const shuffled = [...TREES].sort(() => Math.random() - 0.5)
  const count = randInt(1, 3)
  return shuffled.slice(0, count).map(tree_name => ({ tree_name, quantity: randInt(1, 50) }))
}

async function seedOrganizations() {
  console.log(`Seeding ${DEPARTMENTS.length} organizations ...`)
  for (const name of DEPARTMENTS) {
    const res = await fetch(`${BASE_URL}/api/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_SECRET },
      body: JSON.stringify({ name }),
    })
    if (!res.ok && res.status !== 409) {
      const data = await res.json()
      console.error(`  failed to add "${name}":`, data.error)
    }
  }
}

async function seed() {
  await seedOrganizations()

  console.log(`Seeding ${COUNT} dummy submissions against ${BASE_URL} ...`)
  const created = []

  for (let i = 0; i < COUNT; i++) {
    const { latitude, longitude } = randCoord()
    const body = {
      department: rand(DEPARTMENTS),
      zone: rand(ZONES),
      trees: randomTreeEntries(),
      location_name: rand(LOCATION_NAMES) || undefined,
      notes: rand(NOTES) || undefined,
      latitude,
      longitude,
    }

    const res = await fetch(`${BASE_URL}/api/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error(`  [${i}] failed:`, data.error)
      continue
    }
    for (const t of data.trees) created.push(t.id)
    process.stdout.write(`\r  created ${created.length} tree rows from ${i + 1}/${COUNT} submissions`)
  }
  console.log()

  // Mark a realistic mix as verified / rejected via the admin PATCH endpoint
  let verified = 0, rejected = 0
  for (const id of created) {
    const roll = Math.random()
    if (roll < 0.6) {
      await fetch(`${BASE_URL}/api/trees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_SECRET },
        body: JSON.stringify({ status: 'verified', verified_by: 'seed-script' }),
      })
      verified++
    } else if (roll < 0.7) {
      await fetch(`${BASE_URL}/api/trees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_SECRET },
        body: JSON.stringify({ status: 'rejected', verified_by: 'seed-script' }),
      })
      rejected++
    }
    // remaining ~30% stay pending
  }

  console.log(`Done. ${created.length} tree rows created — ${verified} verified, ${rejected} rejected, ${created.length - verified - rejected} pending.`)
}

seed().catch(err => { console.error(err); process.exit(1) })
