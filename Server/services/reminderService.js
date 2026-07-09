import { supabase } from '../config/supabase.js';
import { sendReminderSMS } from './smsService.js';

/**
 * Checks for trips departing within the next 2 hours and sends SMS reminders.
 * Designed to be run every minute via a cron job.
 * 
 * NOTE: The DB stores departure as a single timestamptz column called 'departure_time'
 * (not separate departure_date + departure_time columns).
 */
export const sendUpcomingTripReminders = async () => {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find all trips departing in the next 2 hours that haven't sent reminders yet
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, departure_time')
      .gte('departure_time', now.toISOString())
      .lte('departure_time', twoHoursFromNow.toISOString());

    if (tripsError) {
      console.error('Error fetching upcoming trips for reminders:', tripsError);
      return;
    }

    if (!trips || trips.length === 0) return;

    for (const trip of trips) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, passenger_phone, passenger_name')
        .eq('trip_id', trip.id)
        .eq('reminder_sent', false);

      if (bookingsError || !bookings) {
        console.error(`Error fetching bookings for trip ${trip.id}:`, bookingsError);
        continue;
      }

      for (const booking of bookings) {
        if (booking.passenger_phone) {
          sendReminderSMS(booking.passenger_phone, booking.passenger_name).catch(err =>
            console.error(`Failed to send reminder to ${booking.passenger_phone}:`, err)
          );

          // Mark reminder as sent
          await supabase
            .from('bookings')
            .update({ reminder_sent: true })
            .eq('id', booking.id);
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error in sendUpcomingTripReminders:', err);
  }
};
