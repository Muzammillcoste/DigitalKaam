/**
 * seed-demo.ts — Creates 20 demo customers + 20 demo providers, all in DHA area.
 *
 * All accounts use password:  Demo1234!
 *
 * CUSTOMERS  →  customer01@demo.dk … customer20@demo.dk
 * PROVIDERS  →  ac.pro1@demo.dk     (AC Technician  ×4)
 *               elec.pro1@demo.dk   (Electrician    ×4)
 *               plumb.pro1@demo.dk  (Plumber        ×3)
 *               mech.pro1@demo.dk   (Mechanic       ×3)
 *               tutor.pro1@demo.dk  (Tutor          ×3)
 *               beauty.pro1@demo.dk (Beautician     ×3)
 *
 * Run: npm run seed:demo
 */

import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const DEMO_PASSWORD = 'Demo1234!'
const DEMO_AREA     = 'PECHS'
const DHA_LAT       = 24.8697   // PECHS lat
const DHA_LNG       = 67.0490   // PECHS lng

// ── Customer data ─────────────────────────────────────────────────────────────

const CUSTOMERS = [
  { n: '01', name: 'Ali Hassan',      phone: '0311-0000001' },
  { n: '02', name: 'Sara Ahmed',      phone: '0311-0000002' },
  { n: '03', name: 'Bilal Khan',      phone: '0311-0000003' },
  { n: '04', name: 'Fatima Malik',    phone: '0311-0000004' },
  { n: '05', name: 'Usman Raza',      phone: '0311-0000005' },
  { n: '06', name: 'Ayesha Siddiqui', phone: '0311-0000006' },
  { n: '07', name: 'Kamran Mirza',    phone: '0311-0000007' },
  { n: '08', name: 'Nadia Tariq',     phone: '0311-0000008' },
  { n: '09', name: 'Hassan Butt',     phone: '0311-0000009' },
  { n: '10', name: 'Zara Sheikh',     phone: '0311-0000010' },
  { n: '11', name: 'Imran Qureshi',   phone: '0311-0000011' },
  { n: '12', name: 'Hira Farooq',     phone: '0311-0000012' },
  { n: '13', name: 'Asif Naqvi',      phone: '0311-0000013' },
  { n: '14', name: 'Sana Iqbal',      phone: '0311-0000014' },
  { n: '15', name: 'Waqas Chaudhry',  phone: '0311-0000015' },
  { n: '16', name: 'Rabia Ansari',    phone: '0311-0000016' },
  { n: '17', name: 'Tariq Hussain',   phone: '0311-0000017' },
  { n: '18', name: 'Amna Baig',       phone: '0311-0000018' },
  { n: '19', name: 'Faisal Lodhi',    phone: '0311-0000019' },
  { n: '20', name: 'Maria Rizvi',     phone: '0311-0000020' },
]

// ── Provider data ─────────────────────────────────────────────────────────────

interface ProviderTemplate {
  slug: string
  name: string
  phone: string
  serviceType: string
  specialization: string
  experienceYears: number
  hourlyRate: number
  rating: number
  reviewCount: number
  skills: string[]
}

const PROVIDERS: ProviderTemplate[] = [
  // ── AC Technicians (×4) ──────────────────────────────────────────────────
  {
    slug: 'ac.pro1', name: 'Zubair Cool Tech',
    phone: '0321-1000001', serviceType: 'AC Technician',
    specialization: 'Inverter AC Repair', experienceYears: 8,
    hourlyRate: 900, rating: 4.8, reviewCount: 142,
    skills: ['Inverter repair', 'Gas refill', 'PCB diagnosis'],
  },
  {
    slug: 'ac.pro2', name: 'Nasir AC Solutions',
    phone: '0321-1000002', serviceType: 'AC Technician',
    specialization: 'Split AC Service', experienceYears: 5,
    hourlyRate: 750, rating: 4.5, reviewCount: 87,
    skills: ['Split AC installation', 'Cleaning', 'Gas refill'],
  },
  {
    slug: 'ac.pro3', name: 'Arif Freeze Tech',
    phone: '0321-1000003', serviceType: 'AC Technician',
    specialization: 'AC Gas Refill', experienceYears: 4,
    hourlyRate: 650, rating: 4.3, reviewCount: 61,
    skills: ['Gas charging', 'Leak detection', 'Filter cleaning'],
  },
  {
    slug: 'ac.pro4', name: 'Junaid Cooling Experts',
    phone: '0321-1000004', serviceType: 'AC Technician',
    specialization: 'General AC Service', experienceYears: 3,
    hourlyRate: 600, rating: 4.1, reviewCount: 34,
    skills: ['General servicing', 'Filter cleaning', 'Gas check'],
  },

  // ── Electricians (×4) ────────────────────────────────────────────────────
  {
    slug: 'elec.pro1', name: 'Shahid Power Solutions',
    phone: '0321-2000001', serviceType: 'Electrician',
    specialization: '3-Phase Wiring', experienceYears: 10,
    hourlyRate: 950, rating: 4.9, reviewCount: 213,
    skills: ['3-phase wiring', 'Load balancing', 'Panel work'],
  },
  {
    slug: 'elec.pro2', name: 'Aamir Volt Tech',
    phone: '0321-2000002', serviceType: 'Electrician',
    specialization: 'Solar Installation', experienceYears: 6,
    hourlyRate: 850, rating: 4.6, reviewCount: 95,
    skills: ['Solar panel installation', 'Inverter setup', 'Net metering'],
  },
  {
    slug: 'elec.pro3', name: 'Salman Electric Works',
    phone: '0321-2000003', serviceType: 'Electrician',
    specialization: 'Fault Detection', experienceYears: 7,
    hourlyRate: 700, rating: 4.4, reviewCount: 78,
    skills: ['Short circuit detection', 'Fault tracing', 'Wiring repair'],
  },
  {
    slug: 'elec.pro4', name: 'Raza Wiring Experts',
    phone: '0321-2000004', serviceType: 'Electrician',
    specialization: 'General Electrical', experienceYears: 4,
    hourlyRate: 550, rating: 4.2, reviewCount: 45,
    skills: ['Wiring', 'Switch installation', 'Fan fixing'],
  },

  // ── Plumbers (×3) ────────────────────────────────────────────────────────
  {
    slug: 'plumb.pro1', name: 'Adnan Pipe Solutions',
    phone: '0321-3000001', serviceType: 'Plumber',
    specialization: 'Pipe Replacement', experienceYears: 9,
    hourlyRate: 700, rating: 4.7, reviewCount: 167,
    skills: ['GI pipe fitting', 'CPVC installation', 'Leak detection'],
  },
  {
    slug: 'plumb.pro2', name: 'Mohsin Water Services',
    phone: '0321-3000002', serviceType: 'Plumber',
    specialization: 'Drain Cleaning', experienceYears: 5,
    hourlyRate: 550, rating: 4.3, reviewCount: 82,
    skills: ['Drain jetting', 'Blockage removal', 'Pipe snaking'],
  },
  {
    slug: 'plumb.pro3', name: 'Tahir Flow Tech',
    phone: '0321-3000003', serviceType: 'Plumber',
    specialization: 'General Plumbing', experienceYears: 3,
    hourlyRate: 450, rating: 4.0, reviewCount: 29,
    skills: ['Tap fitting', 'General repairs', 'Toilet repair'],
  },

  // ── Mechanics (×3) ───────────────────────────────────────────────────────
  {
    slug: 'mech.pro1', name: 'Hamza Auto Works',
    phone: '0321-4000001', serviceType: 'Mechanic',
    specialization: 'Engine Overhaul', experienceYears: 12,
    hourlyRate: 1200, rating: 4.9, reviewCount: 304,
    skills: ['Engine rebuild', 'Valve timing', 'ECU scanning'],
  },
  {
    slug: 'mech.pro2', name: 'Rizwan Car Care',
    phone: '0321-4000002', serviceType: 'Mechanic',
    specialization: 'Brake System', experienceYears: 7,
    hourlyRate: 850, rating: 4.5, reviewCount: 121,
    skills: ['Brake pads', 'Disc replacement', 'ABS repair'],
  },
  {
    slug: 'mech.pro3', name: 'Khalid Motor Services',
    phone: '0321-4000003', serviceType: 'Mechanic',
    specialization: 'General Service', experienceYears: 4,
    hourlyRate: 700, rating: 4.1, reviewCount: 56,
    skills: ['Oil change', 'Filter service', 'Tire rotation'],
  },

  // ── Tutors (×3) ──────────────────────────────────────────────────────────
  {
    slug: 'tutor.pro1', name: 'Dr. Saad Mathematics',
    phone: '0321-5000001', serviceType: 'Tutor',
    specialization: 'Mathematics', experienceYears: 11,
    hourlyRate: 1200, rating: 4.9, reviewCount: 198,
    skills: ['Calculus', 'Algebra', 'Statistics', 'O/A levels'],
  },
  {
    slug: 'tutor.pro2', name: 'Prof. Iqra Physics',
    phone: '0321-5000002', serviceType: 'Tutor',
    specialization: 'Physics', experienceYears: 8,
    hourlyRate: 1000, rating: 4.7, reviewCount: 134,
    skills: ['Mechanics', 'Optics', 'Thermodynamics', 'A levels'],
  },
  {
    slug: 'tutor.pro3', name: 'Maham English Academy',
    phone: '0321-5000003', serviceType: 'Tutor',
    specialization: 'English', experienceYears: 6,
    hourlyRate: 800, rating: 4.5, reviewCount: 89,
    skills: ['Grammar', 'Essay writing', 'Spoken English', 'IELTS prep'],
  },

  // ── Beauticians (×3) ─────────────────────────────────────────────────────
  {
    slug: 'beauty.pro1', name: 'Shereen Bridal Studio',
    phone: '0321-6000001', serviceType: 'Beautician',
    specialization: 'Bridal Makeup', experienceYears: 9,
    hourlyRate: 1800, rating: 4.9, reviewCount: 276,
    skills: ['Bridal makeup', 'Airbrush', 'HD makeup', 'Hair styling'],
  },
  {
    slug: 'beauty.pro2', name: 'Noor Hair & Skin',
    phone: '0321-6000002', serviceType: 'Beautician',
    specialization: 'Hair Styling', experienceYears: 5,
    hourlyRate: 1200, rating: 4.6, reviewCount: 143,
    skills: ['Hair coloring', 'Keratin', 'Hair styling', 'Highlights'],
  },
  {
    slug: 'beauty.pro3', name: 'Laila Beauty Hub',
    phone: '0321-6000003', serviceType: 'Beautician',
    specialization: 'Skin Care', experienceYears: 4,
    hourlyRate: 900, rating: 4.3, reviewCount: 67,
    skills: ['Facial', 'Bleach', 'Cleanup', 'Skin treatment'],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function jitter(base: number, amount = 0.01): number {
  return base + (Math.random() - 0.5) * amount
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Returns existing auth user id or null */
async function findAuthUser(email: string): Promise<string | null> {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  return data?.users.find(u => u.email === email)?.id ?? null
}

/** Creates auth user + user_profile. Returns userId. */
async function ensureCustomer(email: string, name: string, phone: string): Promise<string> {
  let userId = await findAuthUser(email)

  if (userId) {
    process.stdout.write(`  ⏭  ${email} already exists\n`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    })
    if (error || !data.user) throw new Error(`Auth create failed for ${email}: ${error?.message}`)
    userId = data.user.id
    process.stdout.write(`  ✅  ${email} created\n`)
  }

  const { error: profErr } = await supabase.from('user_profiles').upsert({
    id: userId,
    full_name: name,
    email,
    phone,
    home_area: DEMO_AREA,
  })
  if (profErr) process.stderr.write(`  ⚠  profile upsert warning for ${email}: ${profErr.message}\n`)

  return userId
}

/** Creates auth user + user_profile + provider row + reputation row. Returns providerId. */
async function ensureProvider(template: ProviderTemplate): Promise<string> {
  const email = `${template.slug}@demo.dk`
  let userId = await findAuthUser(email)

  if (userId) {
    process.stdout.write(`  ⏭  ${email} already exists\n`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: template.name },
    })
    if (error || !data.user) throw new Error(`Auth create failed for ${email}: ${error?.message}`)
    userId = data.user.id
    process.stdout.write(`  ✅  ${email} created\n`)
  }

  // user_profile
  const { error: profErr } = await supabase.from('user_profiles').upsert({
    id: userId,
    full_name: template.name,
    email,
    phone: template.phone,
    home_area: DEMO_AREA,
  })
  if (profErr) process.stderr.write(`  ⚠  profile upsert warning for ${email}: ${profErr.message}\n`)

  // Check if provider row already exists for this user_id
  const { data: existing } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  let providerId: string

  if (existing?.id) {
    providerId = existing.id
    process.stdout.write(`  ⏭  provider row already exists for ${email}\n`)
  } else {
    providerId = uuidv4()
    const { error: provErr } = await supabase.from('providers').insert({
      id: providerId,
      user_id: userId,
      name: template.name,
      phone: template.phone,
      email,
      service_type: template.serviceType,
      specialization: template.specialization,
      experience_years: template.experienceYears,
      hourly_rate: template.hourlyRate,
      rating: template.rating,
      review_count: template.reviewCount,
      review_recency_score: 0.9,
      on_time_score: 92,
      reliability_score: 90,
      cancellation_rate: 0.03,
      capacity: 4,
      skills: template.skills,
      certifications: [],
      travel_radius: 15,
      lat: jitter(DHA_LAT),
      lng: jitter(DHA_LNG),
      area: DEMO_AREA,
      status: 'active',
    })
    if (provErr) throw new Error(`providers insert failed for ${email}: ${provErr.message}`)

    const { error: repErr } = await supabase.from('reputation').insert({
      id: uuidv4(),
      provider_id: providerId,
      positive_reviews: Math.floor(template.reviewCount * (template.rating / 5)),
      negative_reviews: Math.floor(template.reviewCount * ((5 - template.rating) / 5)),
      complaints: 0,
      disputes: 0,
      last_updated: new Date().toISOString(),
    })
    if (repErr) process.stderr.write(`  ⚠  reputation insert warning for ${email}: ${repErr.message}\n`)
  }

  return providerId
}

/** Seeds 7 days of availability for a provider (if none exist yet). */
async function seedAvailability(providerId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { count } = await supabase
    .from('availability')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .gte('date', today)

  if ((count ?? 0) > 0) return  // already has future slots

  const slots = []
  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']

  for (let day = 0; day < 7; day++) {
    const d = new Date()
    d.setDate(d.getDate() + day)
    const dateStr = d.toISOString().split('T')[0]

    for (const start of timeSlots) {
      const endHour = parseInt(start.split(':')[0]) + 2
      slots.push({
        id: uuidv4(),
        provider_id: providerId,
        date: dateStr,
        start_time: start,
        end_time: `${String(endHour).padStart(2, '0')}:00`,
        is_booked: false,
        travel_buffer: 30,
      })
    }
  }

  for (let i = 0; i < slots.length; i += 100) {
    await supabase.from('availability').insert(slots.slice(i, i + 100))
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedDemo() {
  console.log('\n🌱 DigitalKaam Demo Seed — DHA Area\n')
  console.log('Password for ALL accounts: Demo1234!\n')
  console.log('━'.repeat(60))

  // ── 1. Customers ────────────────────────────────────────────────────────
  console.log('\n👥 Creating 20 demo customers (customer01–20@demo.dk)...\n')

  const customerIds: string[] = []
  for (const c of CUSTOMERS) {
    const email = `customer${c.n}@demo.dk`
    const id = await ensureCustomer(email, c.name, c.phone)
    customerIds.push(id)
  }

  // ── 2. Providers ─────────────────────────────────────────────────────────
  console.log('\n👷 Creating 20 demo providers...\n')

  const providerIds: string[] = []
  for (const p of PROVIDERS) {
    const id = await ensureProvider(p)
    providerIds.push(id)
    await seedAvailability(id)
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '━'.repeat(60))
  console.log('\n✅ Done! Here are your demo accounts:\n')

  console.log('CUSTOMERS (login → chat → book a service in DHA):')
  console.log('  customer01@demo.dk … customer20@demo.dk')
  console.log('  Password: Demo1234!\n')

  console.log('PROVIDERS (login → view bookings assigned to you):')
  const grouped: Record<string, string[]> = {}
  for (const p of PROVIDERS) {
    if (!grouped[p.serviceType]) grouped[p.serviceType] = []
    grouped[p.serviceType].push(`${p.slug}@demo.dk`)
  }
  for (const [svcType, emails] of Object.entries(grouped)) {
    console.log(`  ${svcType}:`)
    for (const e of emails) console.log(`    ${e}`)
  }
  console.log('\n  Password: Demo1234!\n')
  console.log('All providers are in PECHS — ask the AI for any service in PECHS to see them suggested.\n')
}

seedDemo().catch(err => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
