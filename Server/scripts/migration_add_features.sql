-- Add new columns for feature enhancements

ALTER TABLE routes ADD COLUMN IF NOT EXISTS destination_address VARCHAR(255);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS security_fee DECIMAL(10, 2) DEFAULT 500;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(50) UNIQUE;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
