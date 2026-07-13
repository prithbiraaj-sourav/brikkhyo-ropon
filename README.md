# বৃক্ষ নিধি 🌿
### শরীয়তপুর সদর উপজেলা — বৃক্ষরোপণ ট্র্যাকিং সিস্টেম

A bilingual (Bangla) tree plantation registry for Shariatpur Sadar Upazila (175.09 km²).  
**Volunteer form** → submit tree planting with GPS  
**Admin dashboard** → map view with clustering, stats, and record management

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend + API | Next.js 14 (App Router) | Free |
| Database | Supabase (PostgreSQL) | Free |
| Map tiles | OpenStreetMap + Leaflet | Free |
| Hosting | Vercel | Free |
| Domain | `.com.bd` or `.org.bd` | ~৳1,200/year |

**Total: ~৳1,200/year** (just the domain)

---

## Project Structure

```
brikhkha-nidhi/
├── src/
│   ├── app/
│   │   ├── volunteer/page.tsx    ← Public volunteer form
│   │   ├── admin/page.tsx        ← Admin dashboard
│   │   ├── login/page.tsx        ← Admin login
│   │   └── api/
│   │       ├── trees/route.ts    ← GET / POST trees
│   │       ├── trees/[id]/route.ts ← PATCH / DELETE
│   │       ├── stats/route.ts    ← Dashboard stats
│   │       └── auth/route.ts     ← Admin login verify
│   ├── components/
│   │   └── TreeMap.tsx           ← Leaflet + MarkerCluster map
│   └── lib/
│       ├── supabase.ts           ← DB client + types
│       └── constants.ts          ← Zones, species, map config
├── supabase/migrations/
│   └── 001_initial_schema.sql   ← Run this first in Supabase
├── .env.local.example           ← Copy to .env.local
└── vercel.json                  ← Vercel deploy config
```

---

## Deployment (Step by Step)

### Step 1 — Set up Supabase (Free)

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Choose a name (e.g., `brikhkha-nidhi`) and a strong database password
3. Once the project is ready, go to **SQL Editor**
4. Paste the entire contents of `supabase/migrations/001_initial_schema.sql` and click **Run**
5. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this secret!)

### Step 2 — Deploy on Vercel (Free)

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add Environment Variables (Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL       = your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY  = your-anon-key
SUPABASE_SERVICE_ROLE_KEY      = your-service-role-key
ADMIN_SECRET                   = a-strong-random-password
```

4. Click **Deploy** — done!

### Step 3 — Test locally first

```bash
# Clone and install
npm install

# Copy environment file
cp .env.local.example .env.local
# Fill in your Supabase keys in .env.local

# Start dev server
npm run dev
```

Open:
- `http://localhost:3000/volunteer` — Volunteer form
- `http://localhost:3000/admin`    — Admin dashboard (login with ADMIN_SECRET)
- `http://localhost:3000/login`    — Admin login

---

## Pages & Routes

| URL | Who | Description |
|-----|-----|-------------|
| `/volunteer` | All volunteers | Submit tree planting form |
| `/login` | Admin | Password login |
| `/admin` | Admin only | Dashboard — overview, map, records |

### API Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `POST` | `/api/trees` | Public | Submit new tree |
| `GET`  | `/api/trees` | Public / Admin | List trees (verified only for public) |
| `PATCH`| `/api/trees/:id` | Admin | Verify / reject a tree |
| `DELETE`| `/api/trees/:id` | Admin | Delete a tree record |
| `GET`  | `/api/stats` | Admin | Dashboard statistics |
| `POST` | `/api/auth` | Public | Validate admin password |

---

## Map Design: Handling 30,000 Trees

The map uses **Leaflet MarkerCluster**:
- At low zoom (district view): thousands of points collapse into numbered circles
- Color-coded: teal = sparse, green = medium, blue = dense cluster
- Zoom in → clusters split → individual tree markers appear
- Click any marker → popup with volunteer name, species, zone, verification status

---

## Prevent Supabase Free Tier Pausing

Free Supabase projects pause after 7 days of inactivity.  
Add this GitHub Action to keep it alive:

Create `.github/workflows/keepalive.yml`:
```yaml
name: Keep Supabase Alive
on:
  schedule:
    - cron: '0 9 */3 * *'  # every 3 days at 9am
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: curl -s "${{ secrets.SUPABASE_URL }}/rest/v1/trees?limit=1" \
             -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" > /dev/null
```

Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets.

---

## Scaling Up (When Needed)

| Need | Solution | Cost |
|------|---------|------|
| More than 500MB data | Supabase Pro | $25/mo |
| No project pausing | Supabase Pro | $25/mo |
| High traffic | Vercel Pro | $20/mo |
| Better map performance | Server-side clustering with `supercluster` | Free |
| Offline volunteer forms | PWA + IndexedDB sync | Free |

For 30,000 trees, the free tier comfortably handles everything.

---

## Security Notes

- `ADMIN_SECRET` is used as a simple password — change it to something strong (32+ chars)
- Row Level Security (RLS) is enabled on the `trees` table
- Volunteers can only INSERT (not read others' phone numbers)
- Public can only read `verified` trees
- `service_role` key is server-side only, never sent to the browser
- Coordinates are validated to Shariatpur Sadar bounds on both client and server

---

*Built for Shariatpur Sadar Upazila, Shariatpur District, Dhaka Division, Bangladesh*  
*Coordinates: 23°08′–23°18′N, 90°14′–90°23′E · Area: 175.09 km²*
