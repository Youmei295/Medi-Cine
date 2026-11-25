-- Expect: end_time <= start_time rejected
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  mid BIGINT;
  rid BIGINT;
BEGIN
  SELECT id INTO mid FROM movies ORDER BY id LIMIT 1;
  SELECT id INTO rid FROM rooms ORDER BY id LIMIT 1;

  BEGIN
    INSERT INTO showtimes (movie_id, room_id, start_time, end_time, status)
    VALUES (mid, rid, '2026-12-01 10:00:00+00', '2026-12-01 10:00:00+00', 'DRAFT');
  EXCEPTION
    WHEN check_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected check_violation for end_time <= start_time';
  END IF;
END;
$$;

ROLLBACK;
