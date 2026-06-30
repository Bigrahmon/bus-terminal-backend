import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import { sendRegistrationSMS } from '../services/smsService.js';

function formatUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return {
    ...safe,
    name: safe.name ?? safe.full_name,
    phone: safe.phone ?? safe.phone_number,
  };
}

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const register = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        message: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Server/.env',
      });
    }

    const { fullName, email, phoneNumber, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        name: fullName,
        email,
        phone: phoneNumber || '0000000000',
        password_hash: hashedPassword,
      }])
      .select('id, name, email, phone, created_at')
      .single();

    if (error) throw error;

    if (phoneNumber) {
      // Send registration SMS asynchronously
      sendRegistrationSMS(phoneNumber).catch(err => console.error("Failed to send registration SMS:", err));
    }

    res.status(201).json({ message: 'User registered successfully', user: formatUser(newUser) });
  } catch (error) {
    console.error('Registration error:', error);
    const detail = error?.message || error?.details || String(error);
    res.status(500).json({
      message: 'Server error during registration',
      detail
    });
  }
};

export const login = async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        message: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Server/.env',
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ message: 'Login successful', user: formatUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    const detail = error?.message || error?.details || String(error);
    res.status(500).json({
      message: 'Server error during login',
      detail
    });
  }
};
