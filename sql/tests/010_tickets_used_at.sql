-- Expect: used_at set while status=VALID rejected
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  uid BIGINT;
  ssid BIGINT;
  bid BIGINT;
  item_id BIGINT;
BEGIN
  SELECT id INTO uid FROM users WHERE role = 'CUSTOMER' LIMIT 1;
  SELECT id INTO ssid FROM showtime_seats WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1;

  INSERT INTO bookings (user_id, subtotal, discount_amount, total_amount, status, expires_at)
  VALUES (uid, 70000, 0, 70000, 'PAID', now() + interval '15 minutes')
  RETURNING id INTO bid;

  INSERT INTO booking_items (booking_id, showtime_seat_id, price, status)
  VALUES (bid, ssid, 70000, 'ACTIVE')
  RETURNING id INTO item_id;

  BEGIN
    INSERT INTO tickets (booking_item_id, qr_code, status, used_at)
    VALUES (item_id, 'QR-USED-AT-INVALID', 'VALID', now());
  EXCEPTION
    WHEN check_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected check_violation for used_at with status VALID';
  END IF;
END;
$$;

ROLLBACK;
