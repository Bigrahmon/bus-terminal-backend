import { supabase } from '../config/supabase.js';
import { sendReminderSMS } from './smsService.js';

/**
 * Checks for trips departing in exactly 1 hour and sends SMS reminders to passengers.
 * Designed to be run every minute via a cron job.
 */
export const sendUpcomingTripReminders = async () => {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60000);
    const oneHourAndOneMinuteFromNow = new Date(now.getTime() + 61 * 60000);

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, departure_time')
      .gte('departure_time', oneHourFromNow.toISOString())
      .lt('departure_time', oneHourAndOneMinuteFromNow.toISOString());

    if (tripsError) {
      console.error('Error fetching upcoming trips for reminders:', tripsError);
      return;
    }

    if (!trips || trips.length === 0) {
      return;
    }

    for (const trip of trips) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('passenger_phone')
        .eq('trip_id', trip.id);
        
      if (bookingsError || !bookings) {
        console.error(`Error fetching bookings for trip ${trip.id}:`, bookingsError);
        continue;
      }

      for (const booking of bookings) {
        if (booking.passenger_phone) {
          sendReminderSMS(booking.passenger_phone).catch(err => 
            console.error(`Failed to send reminder to ${booking.passenger_phone}:`, err)
          );
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error in sendUpcomingTripReminders:', err);
  }
};
