import { supabase } from '../config/supabase.js';
import { releaseExpiredHolds } from '../services/seatService.js';
import { ensureSeatsForTrip } from '../services/tripService.js';
import {
  ensureBusesExist,
  ensureRoute,
  ensureTripForBus,
  getAvailableSeatCount,
} from '../services/tripService.js';

export const getRoutes = async (req, res) => {
  try {
    const { data, error } = await supabase.from('routes').select('*');
    if (error) throw error;
    res.status(200).json({ routes: data });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching routes' });
  }
};

export const searchTrips = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ message: 'Origin, destination, and date are required' });
    }

    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      return res.status(400).json({ message: 'Origin and destination must be different' });
    }

    const routeId = await ensureRoute(from.trim(), to.trim());
    const buses = await ensureBusesExist();

    await releaseExpiredHolds();

    const trips = [];
    for (let i = 0; i < buses.length; i++) {
      const trip = await ensureTripForBus(routeId, buses[i], date, i);
      const available_seats = await getAvailableSeatCount(trip.id);
      trips.push({ ...trip, available_seats });
    }

    res.status(200).json({ trips });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error searching trips', details: error.message });
  }
};

export const getTripSeats = async (req, res) => {
  try {
    const { tripId } = req.params;

    await releaseExpiredHolds();

    let { data: seats, error } = await supabase
      .from('seats')
      .select('id, seat_number, status')
      .eq('trip_id', tripId)
      .order('seat_number');

    if (error) throw error;

    if (seats.length === 0) {
      await ensureSeatsForTrip(tripId);
      const { data: newSeats, error: refetchError } = await supabase
        .from('seats')
        .select('id, seat_number, status')
        .eq('trip_id', tripId)
        .order('seat_number');

      if (refetchError) throw refetchError;
      seats = newSeats;
    }

    res.status(200).json({ seats });
  } catch (error) {
    console.error('getTripSeats error:', error);
    res.status(500).json({ message: 'Server error fetching seats' });
  }
};

export const trackTrip = async (req, res) => {
  try {
    const { trackingCode } = req.params;
    if (!trackingCode) {
      return res.status(400).json({ message: 'Tracking code is required' });
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        id, departure_time,
        routes (from_city, to_city, destination_address),
        buses (name, plate_number)
      `)
      .eq('tracking_code', trackingCode)
      .single();

    if (error || !trip) {
      return res.status(404).json({ message: 'Trip not found or invalid tracking code' });
    }

    // Mock tracking data based on time
    const now = new Date();
    const departure = new Date(trip.departure_time);
    const diff = now - departure;

    let status = 'Scheduled';
    let location = trip.routes?.from_city || 'Origin';

    if (diff > 0 && diff < 4 * 60 * 60000) { // Assuming 4 hour trip
      status = 'In Transit';
      location = 'Highway (En route)';
    } else if (diff >= 4 * 60 * 60000) {
      status = 'Arrived';
      location = trip.routes?.to_city || 'Destination';
    }

    res.status(200).json({
      tracking_code: trackingCode,
      status,
      current_location: location,
      trip_details: trip
    });
  } catch (error) {
    console.error('trackTrip error:', error);
    res.status(500).json({ message: 'Server error tracking trip' });
  }
};

export const createRoute = async (req, res) => {
  try {
    const { origin, destination, destination_address, estimated_duration } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }
    const { data, error } = await supabase
      .from('routes')
      .insert([{ 
        destination_address, 
        from_city: origin,
        to_city: destination,
        duration_mins: parseInt(estimated_duration) || 240
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'Route created', route: data });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ message: 'Server error creating route' });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const updates = { ...req.body };
    
    // Map frontend fields to database columns
    if (updates.origin) {
      updates.from_city = updates.origin;
      delete updates.origin;
    }
    if (updates.destination) {
      updates.to_city = updates.destination;
      delete updates.destination;
    }
    if (updates.estimated_duration) {
      updates.duration_mins = parseInt(updates.estimated_duration) || 240;
      delete updates.estimated_duration;
    }
    
    const { data, error } = await supabase
      .from('routes')
      .update(updates)
      .eq('id', routeId)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json({ message: 'Route updated', route: data });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ message: 'Server error updating route' });
  }
};

export const deleteRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { error } = await supabase.from('routes').delete().eq('id', routeId);
    if (error) throw error;
    res.status(200).json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ message: 'Server error deleting route' });
  }
};
