import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const AREAS = ['Gulshan', 'DHA', 'Malir', 'Saddar', 'North Nazimabad', 'Clifton', 'Korangi']

const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Gulshan:          { lat: 24.9217, lng: 67.0991 },
  DHA:              { lat: 24.8142, lng: 67.0792 },
  Malir:            { lat: 24.8957, lng: 67.1958 },
  Saddar:           { lat: 24.8577, lng: 67.0105 },
  'North Nazimabad':{ lat: 24.9369, lng: 67.0431 },
  Clifton:          { lat: 24.8064, lng: 67.0311 },
  Korangi:          { lat: 24.8322, lng: 67.1330 },
}

const SERVICE_PROFILES: Record<string, {
  specializations: string[]
  skills: string[][]
  certifications: string[][]
  rateRange: [number, number]
}> = {
  'AC Technician': {
    specializations: ['Inverter AC Repair', 'Split AC Service', 'AC Gas Refill', 'PCB Repair', 'General AC Service'],
    skills: [
      ['Inverter repair', 'Gas refill', 'PCB diagnosis'],
      ['Split AC installation', 'Cleaning', 'Gas refill'],
      ['Gas charging', 'Leak detection'],
      ['PCB soldering', 'Component replacement'],
      ['Filter cleaning', 'General servicing'],
    ],
    certifications: [['HVAC Level 2'], ['HVAC Level 1'], [], ['PCB Technician'], []],
    rateRange: [600, 1200],
  },
  Electrician: {
    specializations: ['3-Phase Wiring', 'Solar Installation', 'Fault Detection', 'Panel Upgrade', 'General Electrical'],
    skills: [
      ['3-phase wiring', 'Load balancing', 'Panel work'],
      ['Solar panel installation', 'Inverter setup'],
      ['Short circuit detection', 'Fault tracing'],
      ['Distribution board', 'Circuit breaker'],
      ['Wiring', 'Switch installation'],
    ],
    certifications: [['Electrical License A'], ['Solar Certified'], ['Electrical License B'], [], []],
    rateRange: [500, 1000],
  },
  Plumber: {
    specializations: ['Pipe Replacement', 'Leak Repair', 'Drain Cleaning', 'Water Tank', 'General Plumbing'],
    skills: [
      ['GI pipe fitting', 'CPVC installation'],
      ['Leak detection', 'Pipe sealing'],
      ['Drain jetting', 'Blockage removal'],
      ['Tank cleaning', 'Water pump'],
      ['Tap fitting', 'General repairs'],
    ],
    certifications: [[], [], [], [], []],
    rateRange: [400, 800],
  },
  Mechanic: {
    specializations: ['Engine Overhaul', 'AC Repair', 'Brake System', 'Electricals', 'General Service'],
    skills: [
      ['Engine rebuild', 'Valve timing'],
      ['Car AC compressor', 'Refrigerant'],
      ['Brake pads', 'Disc replacement'],
      ['Auto electrical', 'ECU scanning'],
      ['Oil change', 'Filter service'],
    ],
    certifications: [['Auto Tech Level 2'], [], ['Brake Specialist'], ['Auto Electrician'], []],
    rateRange: [700, 1500],
  },
  Tutor: {
    specializations: ['Mathematics', 'Physics', 'English', 'Chemistry', 'Computer Science'],
    skills: [
      ['Calculus', 'Algebra', 'Statistics'],
      ['Mechanics', 'Optics', 'Thermodynamics'],
      ['Grammar', 'Essay writing', 'Spoken English'],
      ['Organic chemistry', 'Inorganic chemistry'],
      ['Python', 'Web development', 'Database'],
    ],
    certifications: [['MSc Mathematics'], ['BSc Physics'], ['IELTS 8.0'], ['MSc Chemistry'], ['CS Degree']],
    rateRange: [500, 1500],
  },
  Beautician: {
    specializations: ['Bridal Makeup', 'Hair Styling', 'Skin Care', 'Nail Art', 'Threading & Waxing'],
    skills: [
      ['Bridal makeup', 'Airbrush', 'HD makeup'],
      ['Hair coloring', 'Keratin', 'Styling'],
      ['Facial', 'Bleach', 'Cleanup'],
      ['Gel nails', 'Nail art', 'Manicure'],
      ['Threading', 'Waxing', 'Eyebrow shaping'],
    ],
    certifications: [['Beauty Diploma'], [], ['Skin Care Certified'], [], []],
    rateRange: [500, 2000],
  },
}

const FIRST_NAMES = ['Ali', 'Ahmed', 'Muhammad', 'Usman', 'Hassan', 'Tariq', 'Bilal', 'Imran', 'Kamran', 'Nasir',
  'Asif', 'Raza', 'Faisal', 'Aamir', 'Salman', 'Waqas', 'Zubair', 'Arif', 'Shahid', 'Junaid',
  'Fatima', 'Ayesha', 'Sana', 'Maria', 'Nadia', 'Hira', 'Zara', 'Rabia', 'Amna', 'Sara']

const LAST_NAMES_SERVICES: Record<string, string[]> = {
  'AC Technician': ['AC Services', 'Cool Tech', 'AC Solutions', 'Cooling Experts', 'Freeze Tech'],
  Electrician: ['Electric Works', 'Power Solutions', 'Electrical Services', 'Wiring Experts', 'Volt Tech'],
  Plumber: ['Plumbing Works', 'Pipe Solutions', 'Water Services', 'Flow Tech', 'Plumbing Experts'],
  Mechanic: ['Auto Works', 'Car Care', 'Motor Services', 'Auto Solutions', 'Garage Experts'],
  Tutor: ['Academy', 'Tutoring', 'Education Center', 'Learning Hub', 'Teaching Services'],
  Beautician: ['Beauty Salon', 'Beauty Studio', 'Makeover Studio', 'Beauty Hub', 'Style Studio'],
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function jitter(base: number, amount: number): number {
  return base + (Math.random() - 0.5) * amount
}

async function seed() {
  console.log('🌱 Starting DigitalKaam seed...\n')

  // ==========================================
  // 1. SEED TEST USERS
  // ==========================================
  console.log('👤 Seeding Test Users...')
  const testUsers = [
    { email: 'user1@digitalkaam.com', password: 'Password123!', name: 'Ali Khan', area: 'Gulshan' },
    { email: 'user2@digitalkaam.com', password: 'Password123!', name: 'Sara Ahmed', area: 'DHA' },
    { email: 'user3@digitalkaam.com', password: 'Password123!', name: 'Bilal Malik', area: 'Clifton' }
  ]

  for (const user of testUsers) {
    // Check if user already exists
    const { data: existing } = await supabase.auth.admin.listUsers()
    const existingUser = existing?.users.find(u => u.email === user.email)

    let userId: string
    if (existingUser) {
      userId = existingUser.id
      console.log(`⏭️  User ${user.email} already exists (${userId})`)
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.name }
      })
      if (authError) {
        console.error(`❌ Failed to create ${user.email}:`, authError.message)
        continue
      }
      userId = authData.user.id
      console.log(`✅ Created auth user: ${user.email} (${userId})`)
    }

    // Upsert user_profile
    const { error: profileError } = await supabase.from('user_profiles').upsert({
      id: userId,
      full_name: user.name,
      email: user.email,
      home_area: user.area,
      phone: '+923001234567'
    })
    if (profileError) console.error(`❌ Profile upsert error for ${user.email}:`, profileError.message)
  }

  // ==========================================
  // 2. SEED PROVIDERS
  // ==========================================
  console.log('\n👷 Seeding Providers...')
  const serviceTypes = Object.keys(SERVICE_PROFILES)
  const providers = []
  const availability = []
  const reputation = []

  let totalCount = 0

  for (const serviceType of serviceTypes) {
    const profile = SERVICE_PROFILES[serviceType]
    const countPerService = serviceType === 'AC Technician' ? 35 : serviceType === 'Electrician' ? 30 : 20

    for (let i = 0; i < countPerService; i++) {
      const area = AREAS[i % AREAS.length]
      const coords = AREA_COORDS[area]
      const firstName = pick(FIRST_NAMES)
      const lastName = pick(LAST_NAMES_SERVICES[serviceType])
      const specIdx = i % profile.specializations.length

      const rating = Math.round(randomBetween(3.2, 5.0) * 10) / 10
      const reviewCount = randomInt(5, 300)
      const reliabilityScore = randomInt(55, 98)
      const onTimeScore = randomInt(60, 99)
      const cancellationRate = Math.round(randomBetween(0.01, 0.20) * 100) / 100
      const reviewRecencyScore = Math.round(randomBetween(0.1, 0.98) * 100) / 100

      const providerId = uuidv4()

      providers.push({
        id: providerId,
        name: `${firstName} ${lastName}`,
        phone: `03${randomInt(10, 49)}-${randomInt(1000000, 9999999)}`,
        email: `provider${totalCount + i}@digitalkaam.pk`,
        service_type: serviceType,
        specialization: profile.specializations[specIdx],
        experience_years: randomInt(1, 15),
        rating,
        review_count: reviewCount,
        review_recency_score: reviewRecencyScore,
        on_time_score: onTimeScore,
        reliability_score: reliabilityScore,
        cancellation_rate: cancellationRate,
        hourly_rate: randomInt(profile.rateRange[0], profile.rateRange[1]),
        capacity: randomInt(2, 6),
        skills: profile.skills[specIdx],
        certifications: profile.certifications[specIdx],
        travel_radius: randomInt(5, 20),
        lat: jitter(coords.lat, 0.04),
        lng: jitter(coords.lng, 0.04),
        area,
        status: 'active',
        expo_push_token: null,
      })

      // Generate availability for next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date()
        date.setDate(date.getDate() + dayOffset)
        const dateStr = date.toISOString().split('T')[0]

        // Generate 5–8 slots per day to ensure widespread availability
        const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
        const shuffled = timeSlots.sort(() => Math.random() - 0.5).slice(0, randomInt(5, 8))
        shuffled.sort()

        for (const startTime of shuffled) {
          const startHour = parseInt(startTime.split(':')[0])
          const endTime = `${String(startHour + 2).padStart(2, '0')}:00`
          availability.push({
            id: uuidv4(),
            provider_id: providerId,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            is_booked: Math.random() < 0.1, // Only 10% booked to ensure mostly free slots
            travel_buffer: 30,
          })
        }
      }

      reputation.push({
        id: uuidv4(),
        provider_id: providerId,
        positive_reviews: Math.floor(reviewCount * (rating / 5)),
        negative_reviews: Math.floor(reviewCount * ((5 - rating) / 5)),
        complaints: randomInt(0, 5),
        disputes: randomInt(0, 3),
        last_updated: new Date().toISOString(),
      })
    }

    totalCount += countPerService
    console.log(`✅ Generated ${countPerService} ${serviceType} providers`)
  }

  console.log(`\n📦 Total providers: ${providers.length}`)
  console.log(`📅 Total availability slots: ${availability.length}`)

  // Insert in batches of 50
  console.log('\n⬆️  Inserting providers...')
  for (let i = 0; i < providers.length; i += 50) {
    const batch = providers.slice(i, i + 50)
    const { error } = await supabase.from('providers').upsert(batch)
    if (error) console.error(`  ❌ Providers batch ${i}-${i + 50}:`, error.message)
    else console.log(`  ✅ Providers batch ${i}–${Math.min(i + 50, providers.length)}`)
  }

  console.log('\n⬆️  Inserting availability...')
  for (let i = 0; i < availability.length; i += 100) {
    const batch = availability.slice(i, i + 100)
    const { error } = await supabase.from('availability').upsert(batch)
    if (error) console.error(`  ❌ Availability batch ${i}-${i + 100}:`, error.message)
    else console.log(`  ✅ Availability batch ${i}–${Math.min(i + 100, availability.length)}`)
  }

  console.log('\n⬆️  Inserting reputation...')
  for (let i = 0; i < reputation.length; i += 50) {
    const batch = reputation.slice(i, i + 50)
    const { error } = await supabase.from('reputation').upsert(batch)
    if (error) console.error(`  ❌ Reputation batch ${i}-${i + 50}:`, error.message)
    else console.log(`  ✅ Reputation batch ${i}–${Math.min(i + 50, reputation.length)}`)
  }

  console.log('\n🎉 Seed complete!')
  console.log(`   ${providers.length} providers`)
  console.log(`   ${availability.length} availability slots`)
  console.log(`   ${reputation.length} reputation records`)
}

seed().catch(console.error)
