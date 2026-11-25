-- Expect: two ACTIVE booking_items for same showtime_seat blocked;
-- after RELEASED, a new ACTIVE item is allowed.
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  uid BIGINT;
  ssid BIGINT;
  bid1 BIGINT;
  bid2 BIGINT;
  item1 BIGINT;
BEGIN
  SELECT id INTO uid FROM users WHERE role = 'CUSTOMER' LIMIT 1;
  SELECT id INTO ssid FROM showtime_seats WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1;

  INSERT INTO bookings (user_id, subtotal, discount_amount, total_amount, status, expires_at)
  VALUES (uid, 100000, 0, 100000, 'PENDING', now() + interval '15 minutes')
  RETURNING id INTO bid1;

  INSERT INTO booking_items (booking_id, showtime_seat_id, price, status)
  VALUES (bid1, ssid, 100000, 'ACTIVE')
  RETURNING id INTO item1;

  INSERT INTO bookings (user_id, subtotal, discount_amount, total_amount, status, expires_at)
  VALUES (uid, 100000, 0, 100000, 'PENDING', now() + interval '15 minutes')
  RETURNING id INTO bid2;

  BEGIN
    INSERT INTO booking_items (booking_id, showtime_seat_id, price, status)
    VALUES (bid2, ssid, 100000, 'ACTIVE');
  EXCEPTION
    WHEN unique_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected unique_violation for two ACTIVE booking_items';
  END IF;

  UPDATE booking_items SET status = 'RELEASED' WHERE id = item1;

  INSERT INTO booking_items (booking_id, showtime_seat_id, price, status)
  VALUES (bid2, ssid, 100000, 'ACTIVE');
END;
$$;

ROLLBACK;
