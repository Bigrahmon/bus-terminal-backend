import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';

dotenv.config();

const DEMO_EMAIL = 'user@example.com';
const DEMO_PASSWORD = 'ticket123';
const DEMO_NAME = 'Demo User';
const DEMO_PHONE = '08000000000';

async function seedDemoUser() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Server/.env');
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle();

  if (existing) {
    console.log(`Demo user already exists (${DEMO_EMAIL}).`);
    return;
  }

  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { error } = await supabase.from('users').insert([
    {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      phone: DEMO_PHONE,
      password_hash,
    },
  ]);

  if (error) {
    console.error('Failed to create demo user:', error);
    process.exit(1);
  }

  console.log(`Demo user created: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seedDemoUser();
