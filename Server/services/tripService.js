import { supabase } from '../config/supabase.js';
import { DEFAULT_BUSES, SEAT_LABELS } from '../data/fleet.js';

const TRIP_SELECT = `
  id,
  bus_id,
  departure_time,
  price,
  buses (name, capacity)
`;

function makeTrackingCode() {
  return 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function ensureBusesExist() {
  const { data: buses, error } = await supabase.from('buses').select('*').order('name');
  if (error) throw error;
  if (buses && buses.length > 0) return buses;

  const { data: inserted, error: insertError } = await supabase
    .from('buses')
    .insert(DEFAULT_BUSES)
    .select('*')
    .order('name');

  if (insertError) throw insertError;
  return inserted || [];
}

export async function ensureRoute(from, to) {
  const { data: routes, error } = await supabase
    .from('routes')
    .select('id')
    .ilike('from_city', from)
    .ilike('to_city', to);

  if (error) throw error;
  if (routes && routes.length > 0) return routes[0].id;

  const { data: newRoute, error: insertError } = await supabase
    .from('routes')
    .insert({ from_city: from, to_city: to, duration_mins: 240 })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return newRoute.id;
}

export async function ensureSeatsForTrip(tripId) {
  const { count, error: countError } = await supabase
    .from('seats')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  if (countError) throw countError;
  if (count > 0) return;

  const seatInserts = SEAT_LABELS.map((seat_number) => ({
    trip_id: tripId,
    seat_number,
    status: 'available',
  }));

  const { error: insertError } = await supabase.from('seats').insert(seatInserts);
  if (insertError) throw insertError;
}

export async function ensureTripForBus(routeId, bus, date, index) {
  const startDate = `${date}T00:00:00.000Z`;
  const endDate = `${date}T23:59:59.999Z`;

  const { data: existing, error: fetchError } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .eq('route_id', routeId)
    .eq('bus_id', bus.id)
    .gte('departure_time', startDate)
    .lte('departure_time', endDate)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) {
    await ensureSeatsForTrip(existing.id);
    return existing;
  }

  const hour = Math.min(20, 6 + index * 2);
  const departure_time = `${date}T${hour.toString().padStart(2, '0')}:00:00.000Z`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: trip, error: insertError } = await supabase
      .from('trips')
      .insert({
        route_id: routeId,
        bus_id: bus.id,
        departure_time,
        price: 15000.0,
        security_fee: 500.0,
        tracking_code: makeTrackingCode(),
      })
      .select(TRIP_SELECT)
      .single();

    if (!insertError && trip) {
      await ensureSeatsForTrip(trip.id);
      return trip;
    }

    if (insertError?.code !== '23505') throw insertError;
  }

  throw new Error(`Could not create trip for bus ${bus.name}`);
}

export async function getAvailableSeatCount(tripId) {
  const { data: seatsData, error } = await supabase
    .from('seats')
    .select('status')
    .eq('trip_id', tripId);

  if (error) throw error;
  if (!seatsData || seatsData.length === 0) return 14;
  return seatsData.filter((s) => s.status === 'available').length;
}
