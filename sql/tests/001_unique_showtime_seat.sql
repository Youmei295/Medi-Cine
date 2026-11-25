-- Expect: duplicate (showtime_id, seat_id) rejected
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  sid BIGINT;
  seat BIGINT;
BEGIN
  SELECT id INTO sid FROM showtimes ORDER BY id LIMIT 1;
  SELECT id INTO seat FROM seats WHERE room_id = (SELECT room_id FROM showtimes WHERE id = sid) LIMIT 1;

  BEGIN
    INSERT INTO showtime_seats (showtime_id, seat_id, status)
    VALUES (sid, seat, 'AVAILABLE');
  EXCEPTION
    WHEN unique_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected unique_violation on showtime_seats(showtime_id, seat_id)';
  END IF;
END;
$$;

ROLLBACK;
