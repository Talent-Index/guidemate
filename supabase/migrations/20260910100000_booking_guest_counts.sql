-- Guest breakdown on bookings for per-guest pricing and admin reporting
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_count integer NOT NULL DEFAULT 1 CHECK (guest_count >= 1),
  ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1 CHECK (adults >= 0),
  ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0 CHECK (children >= 0);

COMMENT ON COLUMN bookings.guest_count IS 'Total guests (adults + children) for this booking';
COMMENT ON COLUMN bookings.adults IS 'Number of adult guests';
COMMENT ON COLUMN bookings.children IS 'Number of child guests';
