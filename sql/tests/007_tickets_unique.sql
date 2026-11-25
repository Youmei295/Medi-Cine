-- Expect: duplicate booking_item_id and duplicate qr_code rejected
BEGIN;

DO $$
DECLARE
  rejected_item boolean := false;
  rejected_qr boolean := false;
  uid BIGINT;
  ssid BIGINT;
  bid BIGINT;
  item_id BIGINT;
BEGIN
  SELECT id INTO uid FROM users WHERE role = 'CUSTOMER' LIMIT 1;
  SELECT id INTO ssid FROM showtime_seats WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1;

  INSERT INTO bookings (user_id, subtotal, discount_amount, total_amount, status, expires_at)
  VALUES (uid, 80000, 0, 80000, 'PAID', now() + interval '15 minutes')
  RETURNING id INTO bid;

  INSERT INTO booking_items (booking_id, showtime_seat_id, price, status)
  VALUES (bid, ssid, 80000, 'ACTIVE')
  RETURNING id INTO item_id;

  INSERT INTO tickets (booking_item_id, qr_code, status)
  VALUES (item_id, 'QR-TEST-UNIQUE-001', 'VALID');

  BEGIN
    INSERT INTO tickets (booking_item_id, qr_code, status)
    VALUES (item_id, 'QR-TEST-UNIQUE-002', 'VALID');
  EXCEPTION
    WHEN unique_violation THEN
      rejected_item := true;
  END;

  IF NOT rejected_item THEN
    RAISE EXCEPTION 'expected unique_violation on tickets.booking_item_id';
  END IF;

  -- second item for qr_code clash
  INSERT INTO booking_items (booking_id, showtime_seat_id, price, status)
  SELECT bid, id, 80000, 'RELEASED'
  FROM showtime_seats
  WHERE id <> ssid AND status = 'AVAILABLE'
  ORDER BY id
  LIMIT 1;

  BEGIN
    INSERT INTO tickets (booking_item_id, qr_code, status)
    SELECT id, 'QR-TEST-UNIQUE-001', 'VALID'
    FROM booking_items
    WHERE booking_id = bid AND status = 'RELEASED'
    LIMIT 1;
  EXCEPTION
    WHEN unique_violation THEN
      rejected_qr := true;
  END;

  IF NOT rejected_qr THEN
    RAISE EXCEPTION 'expected unique_violation on tickets.qr_code';
  END IF;
END;
$$;

ROLLBACK;
