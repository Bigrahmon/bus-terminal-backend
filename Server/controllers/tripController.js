import { supabase } from '../config/supabase.js';
import { releaseExpiredHolds } from '../services/seatService.js';

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

    // Find matching routes
    const { data: routes, error: routeError } = await supabase
      .from('routes')
      .select('id')
      .ilike('from_city', from)
      .ilike('to_city', to);

    let routeId;
    if (!routeError && routes && routes.length > 0) {
      routeId = routes[0].id;
    } else {
      // Auto-generate the route for demo purposes
      const { data: newRoute, error: insertRouteError } = await supabase
        .from('routes')
        .insert({ from_city: from, to_city: to, duration_mins: 240 })
        .select('id')
        .single();
        
      if (!insertRouteError && newRoute) {
        routeId = newRoute.id;
      } else {
        console.log('Failed to generate route:', insertRouteError);
        return res.status(200).json({ trips: [] });
      }
    }

    // Find ALL buses
    const { data: buses } = await supabase.from('buses').select('*');

    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;

    // Find trips for these routes on the given date
    let { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        bus_id,
        departure_time,
        price,
        buses (name, capacity)
      `)
      .eq('route_id', routeId)
      .gte('departure_time', startDate)
      .lte('departure_time', endDate);

    if (tripsError) throw tripsError;

    // Make sure EVERY bus has a trip for this route and date
    const existingBusIds = (trips || []).map(t => t.bus_id);
    const missingBuses = (buses || []).filter(b => !existingBusIds.includes(b.id));
    
    console.log('RouteId:', routeId, 'Trips:', trips?.length, 'Missing buses:', missingBuses.length);
    
    if (missingBuses.length > 0) {
      const newTrips = missingBuses.map((bus, index) => {
        const hour = 8 + (index * 2); // Stagger departure times: 8am, 10am, 12pm, etc.
        const timeStr = `${date}T${hour.toString().padStart(2, '0')}:00:00.000Z`;
        const trackingCode = 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        return {
          route_id: routeId,
          bus_id: bus.id,
          departure_time: timeStr,
          price: 15000.00,
          security_fee: 500.00,
          tracking_code: trackingCode
        };
      });
      
      const { data: insertedTrips, error: insertError } = await supabase
        .from('trips')
        .insert(newTrips)
        .select(`
          id,
          bus_id,
          departure_time,
          price,
          buses (name, capacity)
        `);
        
      console.log('Insert error:', insertError);
      
      if (!insertError && insertedTrips) {
        trips = [...(trips || []), ...insertedTrips];
      }
    }

    // For each trip, get available seats count
    await releaseExpiredHolds();

    const tripsWithSeats = await Promise.all(trips.map(async (trip) => {
      const { data: seatsData } = await supabase
        .from('seats')
        .select('status')
        .eq('trip_id', trip.id);

      let available_seats = 14;
      if (seatsData && seatsData.length > 0) {
        available_seats = seatsData.filter(s => s.status === 'available').length;
      }

      return {
        ...trip,
        available_seats
      };
    }));

    res.status(200).json({ trips: tripsWithSeats });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error searching trips' });
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
      const seatLabels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2'];
      const seatInserts = seatLabels.map(label => ({
        trip_id: tripId,
        seat_number: label,
        status: 'available'
      }));

      const { data: newSeats, error: insertError } = await supabase
        .from('seats')
        .insert(seatInserts)
        .select('id, seat_number, status')
        .order('seat_number');

      if (insertError) throw insertError;
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
        origin, 
        destination, 
        destination_address, 
        estimated_duration,
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
    const updates = req.body;
    
    // Also update legacy columns if origin/destination is provided
    if (updates.origin) updates.from_city = updates.origin;
    if (updates.destination) updates.to_city = updates.destination;
    
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
