import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';
import { DEFAULT_BUSES, CITIES } from '../data/fleet.js';

dotenv.config();

const ROUTES = CITIES.flatMap((from) =>
  CITIES.filter((to) => to !== from).map((to) => ({
    from_city: from,
    to_city: to,
    duration_mins: 240,
  }))
);

async function seedBuses() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Server/.env');
    process.exit(1);
  }

  for (const bus of DEFAULT_BUSES) {
    const { data: existing } = await supabase
      .from('buses')
      .select('id')
      .eq('plate_number', bus.plate_number)
      .maybeSingle();

    if (existing) {
      console.log(`Bus already exists: ${bus.name}`);
      continue;
    }

    const { error } = await supabase.from('buses').insert([bus]);
    if (error) {
      console.error(`Failed to seed bus ${bus.name}:`, error.message);
      process.exit(1);
    }
    console.log(`Seeded bus: ${bus.name}`);
  }

  for (const route of ROUTES) {
    const { data: existing } = await supabase
      .from('routes')
      .select('id')
      .ilike('from_city', route.from_city)
      .ilike('to_city', route.to_city)
      .maybeSingle();

    if (existing) {
      console.log(`Route already exists: ${route.from_city} -> ${route.to_city}`);
      continue;
    }

    const { error } = await supabase.from('routes').insert([route]);
    if (error) {
      console.error(`Failed to seed route ${route.from_city} -> ${route.to_city}:`, error.message);
      process.exit(1);
    }
    console.log(`Seeded route: ${route.from_city} -> ${route.to_city}`);
  }

  console.log('Bus and route seed complete. Trips are created automatically when users search.');
}

seedBuses();
