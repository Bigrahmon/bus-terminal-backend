import { supabase } from '../config/supabase.js';
import { sendReminderSMS } from './smsService.js';

/**
 * Checks for trips departing in exactly 1 hour and sends SMS reminders to passengers.
 * Designed to be run every minute via a cron job.
 */
export const sendUpcomingTripReminders = async () => {
  try {
    const now = new Date();
    // Get current date string in YYYY-MM-DD local time
    const todayStr = now.toISOString().split('T')[0];
    
    // Time in 2 hours
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60000);
    const timeNowStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const timeLimitStr = twoHoursFromNow.toTimeString().split(' ')[0];

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, departure_time')
      .eq('departure_date', todayStr)
      .gte('departure_time', timeNowStr)
      .lte('departure_time', timeLimitStr);

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
        .select('id, passenger_phone')
        .eq('trip_id', trip.id)
        .eq('reminder_sent', false);
        
      if (bookingsError || !bookings) {
        console.error(`Error fetching bookings for trip ${trip.id}:`, bookingsError);
        continue;
      }

      for (const booking of bookings) {
        if (booking.passenger_phone) {
          sendReminderSMS(booking.passenger_phone).catch(err => 
            console.error(`Failed to send reminder to ${booking.passenger_phone}:`, err)
          );
          
          // Mark as sent
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
