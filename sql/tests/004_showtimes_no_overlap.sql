-- Overlap same room blocked; adjacent OK; other room OK; CANCELLED does not block.
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  mid BIGINT;
  room_a BIGINT;
  room_b BIGINT;
BEGIN
  SELECT id INTO mid FROM movies ORDER BY id LIMIT 1;
  SELECT id INTO room_a FROM rooms WHERE name = 'Room A';
  SELECT id INTO room_b FROM rooms WHERE name = 'Room B';

  -- Overlapping with seed showtime 1 (10:00-12:30 Room A) must fail
  BEGIN
    INSERT INTO showtimes (movie_id, room_id, start_time, end_time, status)
    VALUES (mid, room_a, '2026-11-26 11:00:00+00', '2026-11-26 13:00:00+00', 'ACTIVE');
  EXCEPTION
    WHEN exclusion_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected exclusion_violation for overlapping showtimes';
  END IF;

  -- Adjacent: ends exactly when next starts — allowed (range is [start, end))
  INSERT INTO showtimes (movie_id, room_id, start_time, end_time, status)
  VALUES (mid, room_a, '2026-11-26 12:30:00+00', '2026-11-26 13:00:00+00', 'ACTIVE');

  -- Same wall-clock window in another room — allowed
  INSERT INTO showtimes (movie_id, room_id, start_time, end_time, status)
  VALUES (mid, room_b, '2026-11-26 10:00:00+00', '2026-11-26 12:30:00+00', 'ACTIVE');

  -- CANCELLED overlapping does not block a new ACTIVE
  INSERT INTO showtimes (movie_id, room_id, start_time, end_time, status)
  VALUES (mid, room_b, '2026-11-27 10:00:00+00', '2026-11-27 12:00:00+00', 'CANCELLED');

  INSERT INTO showtimes (movie_id, room_id, start_time, end_time, status)
  VALUES (mid, room_b, '2026-11-27 10:30:00+00', '2026-11-27 11:30:00+00', 'ACTIVE');
END;
$$;

ROLLBACK;
