import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

async function check() {
  const { data: providers, error } = await supabase.from('providers').select('name, service_type, area, status, travel_radius')
  console.log(error || providers)
}

check()
