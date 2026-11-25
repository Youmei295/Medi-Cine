-- Expect: HELD without held_until rejected
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  sid BIGINT;
  seat BIGINT;
  uid BIGINT;
  bid BIGINT;
BEGIN
  SELECT id INTO uid FROM users WHERE role = 'CUSTOMER' LIMIT 1;
  SELECT id INTO sid FROM showtimes ORDER BY id LIMIT 1;
  SELECT id INTO seat FROM seats
  WHERE room_id = (SELECT room_id FROM showtimes WHERE id = sid)
    AND id NOT IN (SELECT seat_id FROM showtime_seats WHERE showtime_id = sid)
  LIMIT 1;

  -- If every seat already has a row, use an existing AVAILABLE row by deleting in-tx via update path:
  -- create a fresh showtime instead to isolate
  IF seat IS NULL THEN
    INSERT INTO showtimes (movie_id, room_id, start_time, end_time, status)
    SELECT movie_id, room_id, start_time + interval '1 day', end_time + interval '1 day', 'DRAFT'
    FROM showtimes WHERE id = sid
    RETURNING id INTO sid;

    SELECT id INTO seat FROM seats
    WHERE room_id = (SELECT room_id FROM showtimes WHERE id = sid)
    LIMIT 1;
  END IF;

  INSERT INTO bookings (user_id, subtotal, discount_amount, total_amount, status, expires_at)
  VALUES (uid, 10000, 0, 10000, 'PENDING', now() + interval '15 minutes')
  RETURNING id INTO bid;

  BEGIN
    INSERT INTO showtime_seats (showtime_id, seat_id, status, held_booking_id, held_until)
    VALUES (sid, seat, 'HELD', bid, NULL);
  EXCEPTION
    WHEN check_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected check_violation for HELD without held_until';
  END IF;
END;
$$;

ROLLBACK;
