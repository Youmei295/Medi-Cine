-- Expect: duplicate (room_id, row_label, seat_number) rejected
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  rid BIGINT;
  stid BIGINT;
BEGIN
  SELECT id INTO rid FROM rooms ORDER BY id LIMIT 1;
  SELECT id INTO stid FROM seat_types ORDER BY id LIMIT 1;

  INSERT INTO seats (room_id, seat_type_id, row_label, seat_number, col_index)
  VALUES (rid, stid, 'Z', 99, 99);

  BEGIN
    INSERT INTO seats (room_id, seat_type_id, row_label, seat_number, col_index)
    VALUES (rid, stid, 'Z', 99, 100);
  EXCEPTION
    WHEN unique_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected unique_violation on seats(room_id, row_label, seat_number)';
  END IF;
END;
$$;

ROLLBACK;
