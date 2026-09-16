-- Close stuck demo bookings in the UI (does NOT release Fuji escrow on-chain).
-- Run in Supabase SQL Editor, or POST /api/admin/bookings/close-locked as admin.

UPDATE bookings
SET
  status = 'paid',
  guide_split = ROUND((amount_usdc * 0.85)::numeric, 2),
  hotel_split = 0,
  protocol_split = ROUND((amount_usdc * 0.15)::numeric, 2)
WHERE status = 'locked'
  AND payment_method = 'demo';

UPDATE experience_slots s
SET booked_guests = 0
FROM bookings b
WHERE b.slot_id = s.id
  AND b.status = 'paid'
  AND b.payment_method = 'demo'
  AND b.guide_split IS NOT NULL;
