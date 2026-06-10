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
        return {
          route_id: routeId,
          bus_id: bus.id,
          departure_time: timeStr,
          price: 15000.00
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
