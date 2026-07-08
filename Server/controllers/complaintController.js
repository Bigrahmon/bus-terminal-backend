import { supabase } from '../config/supabase.js';

export const submitComplaint = async (req, res) => {
  try {
    const { name, email, booking_code, category, message } = req.body;

    if (!name || !email || !category || !message) {
      return res.status(400).json({ message: 'Name, email, category, and message are required' });
    }

    const { data, error } = await supabase
      .from('complaints')
      .insert([{
        name,
        email,
        booking_code: booking_code || null,
        category,
        message
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Complaint submitted successfully', complaint: data });
  } catch (error) {
    console.error('Complaint error:', error);
    res.status(500).json({ message: 'Server error submitting complaint' });
  }
};

export const getComplaints = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ complaints: data });
  } catch (error) {
    console.error('Fetch complaints error:', error);
    res.status(500).json({ message: 'Server error fetching complaints' });
  }
};
