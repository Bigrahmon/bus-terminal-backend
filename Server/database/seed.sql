-- Riderr Bus Booking System Seed Data

-- Demo login user (password: ticket123 — hash generated with bcrypt)
-- Or run: npm run seed:demo
INSERT INTO users (name, email, phone, password_hash) VALUES
('Demo User', 'user@example.com', '08000000000', '$2b$10$0/u95APc1/sv2DcL1l48FupiqX4FmeKcIztQ3HSJoPMipH.uZ/PIu')
ON CONFLICT (email) DO NOTHING;

-- Clear existing data (optional, useful for reset)
-- TRUNCATE TABLE bookings, seats, trips, buses, routes, users, complaints CASCADE;

-- Insert Routes (All going to Ado Ekiti)
INSERT INTO routes (origin, destination, estimated_duration) VALUES
('Lagos', 'Ado Ekiti', '5 hours'),
('Ibadan', 'Ado Ekiti', '2.5 hours'),
('Akure', 'Ado Ekiti', '1 hour'),
('Abuja', 'Ado Ekiti', '8 hours'),
('Port Harcourt', 'Ado Ekiti', '10 hours'),
('Ondo', 'Ado Ekiti', '1.5 hours');

-- Insert Buses
INSERT INTO buses (name, plate_number, capacity) VALUES
('Riderr Express', 'LAG-123-XR', 14),
('Ekiti Comfort', 'EK-456-MT', 14),
('Capital Link', 'ABJ-789-KL', 14),
('South Coast Voyager', 'PH-101-GZ', 14),
('Ondo Shuttle', 'ON-202-PL', 14);

-- Note: In a real environment, you would use a script or Supabase Edge Function to generate
-- trips and 14 seats for each trip dynamically for upcoming dates.
-- For demonstration, here's an example of how a trip and its seats would be seeded:

-- Example: Seed ONE trip for Lagos -> Ado Ekiti using 'Riderr Express'
-- (Assuming we fetch the route_id and bus_id first)
DO $$
DECLARE
    v_route_id UUID;
    v_bus_id UUID;
    v_trip_id UUID;
    seat_name VARCHAR;
BEGIN
    SELECT id INTO v_route_id FROM routes WHERE origin = 'Lagos' AND destination = 'Ado Ekiti' LIMIT 1;
    SELECT id INTO v_bus_id FROM buses WHERE name = 'Riderr Express' LIMIT 1;
    
    IF v_route_id IS NOT NULL AND v_bus_id IS NOT NULL THEN
        INSERT INTO trips (route_id, bus_id, departure_date, departure_time, price)
        VALUES (v_route_id, v_bus_id, CURRENT_DATE + INTERVAL '1 day', '08:00:00', 15000.00)
        RETURNING id INTO v_trip_id;
        
        -- Generate 14 seats for this trip
        FOREACH seat_name IN ARRAY ARRAY['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2']
        LOOP
            INSERT INTO seats (trip_id, seat_label, status) VALUES (v_trip_id, seat_name, 'available');
        END LOOP;
    END IF;
END $$;
