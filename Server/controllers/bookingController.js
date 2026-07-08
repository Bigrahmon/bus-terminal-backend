import { supabase } from '../config/supabase.js';
import { sendBookingSMS } from '../services/smsService.js';
import crypto from 'crypto';

// Validate that a string is a proper UUID (required for Supabase UUID columns)
function isValidUUID(str) {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export const holdSeat = async (req, res) => {
  try {
    const { trip_id, seat_number, user_id } = req.body;

    if (!trip_id || !seat_number) {
      return res.status(400).json({ message: 'Trip ID and seat number are required' });
    }

    // held_by is a UUID column — only pass a valid UUID or null
    const validUserId = isValidUUID(user_id) ? user_id : null;

    // Check if seat is available
    const { data: seat, error: fetchError } = await supabase
      .from('seats')
      .select('*')
      .eq('trip_id', trip_id)
      .eq('seat_number', seat_number)
      .single();

    if (fetchError || !seat) {
      console.error('Seat fetch error:', fetchError?.message, '| trip_id:', trip_id, '| seat_number:', seat_number);
      return res.status(404).json({ message: 'Seat not found' });
    }

    if (seat.status !== 'available') {
      // If it's held but expired, we can take it
      if (seat.status === 'held' && new Date(seat.held_until) < new Date()) {
        // expired hold, can proceed
      } else {
        return res.status(400).json({ message: 'Seat is not available' });
      }
    }

    // Set hold for 10 minutes
    const heldUntil = new Date(Date.now() + 10 * 60000).toISOString();

    const { error: updateError } = await supabase
      .from('seats')
      .update({
        status: 'held',
        held_by: validUserId,
        held_until: heldUntil
      })
      .eq('id', seat.id);

    if (updateError) {
      console.error('Seat hold update error:', updateError.message, updateError.code);
      return res.status(400).json({ message: 'Could not hold seat', details: updateError.message });
    }

    res.status(200).json({ message: 'Seat held successfully', held_until: heldUntil, seat_id: seat.id });
  } catch (error) {
    console.error('Hold seat error:', error);
    res.status(500).json({ message: 'Server error holding seat' });
  }
};

export const createBooking = async (req, res) => {
  try {
    const {
      user_id, trip_id, seat_number,
      passenger_name, passenger_email, passenger_phone,
      kin_name, kin_relationship, kin_phone,
      id_type, id_number, notes
    } = req.body;

    // Validate inputs
    if (!trip_id || !seat_number || !passenger_name || !passenger_phone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Ensure we have a valid UUID for user_id
    let finalUserId = isValidUUID(user_id) ? user_id : null;
    if (!finalUserId) {
      const { data: firstUser } = await supabase.from('users').select('id').limit(1).single();
      if (firstUser) finalUserId = firstUser.id;
    }

    // Verify seat exists and is held
    const { data: seat, error: seatError } = await supabase
      .from('seats')
      .select(`
        id, status, held_by,
        trips (
          departure_time,
          price,
          security_fee,
          buses ( name )
        )
      `)
      .eq('trip_id', trip_id)
      .eq('seat_number', seat_number)
      .single();

    if (seatError || !seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // Allow booking if seat is held (by anyone) or still available
    if (seat.status !== 'available' && seat.status !== 'held') {
      return res.status(400).json({ message: 'Seat is already booked' });
    }

    // Generate unique booking code
    const booking_code = 'RDR' + crypto.randomBytes(3).toString('hex').toUpperCase();

    // Update seat to booked
    const { error: seatUpdateError } = await supabase
      .from('seats')
      .update({
        status: 'booked',
        held_by: finalUserId || null,
        held_until: null
      })
      .eq('id', seat.id);

    if (seatUpdateError) throw seatUpdateError;

    // Calculate total price
    const basePrice = parseFloat(seat.trips?.price || 0);
    const securityFee = parseFloat(seat.trips?.security_fee || 500);
    const total_price = basePrice + securityFee;

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        booking_code,
        user_id: finalUserId,
        trip_id,
        seat_id: seat.id,
        passenger_name,
        passenger_phone,
        passenger_email: passenger_email || '',
        kin_name: kin_name || '',
        kin_relationship: kin_relationship || '',
        kin_phone: kin_phone || '',
        id_type: id_type || '',
        id_number: id_number || '',
        notes: notes || '',
        total_price: total_price
      }])
      .select()
      .single();

    if (bookingError) {
      // Rollback seat
      await supabase.from('seats').update({ status: 'available', held_by: null }).eq('id', seat.id);
      throw bookingError;
    }

    const busName = seat.trips?.buses?.name || 'Unknown Bus';
    const rawTime = seat.trips?.departure_time || '';
    const departureTime = rawTime ? new Date(rawTime).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true}) : 'Unknown Time';

    // Send SMS
    sendBookingSMS(
      passenger_phone,
      busName,
      seat_number,
      departureTime
    ).catch(err => console.error("Failed to send booking SMS:", err));

    res.status(201).json({ message: 'Booking confirmed', booking });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Server error creating booking' });
  }
};

export const getBooking = async (req, res) => {
  try {
    const { bookingCode } = req.params;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_code', bookingCode)
      .single();

    if (error || !booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching booking' });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        total_price,
        trips (
          departure_time,
          price,
          security_fee,
          tracking_code,
          routes (
            from_city,
            to_city,
            destination_address
          ),
          buses (
            name,
            plate_number
          )
        ),
        seats (
          seat_number
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Server error fetching user bookings', details: error.message });
  }
};
