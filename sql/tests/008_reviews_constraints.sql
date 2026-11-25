-- Expect: rating 0/6 blocked; duplicate (user_id, movie_id) blocked
BEGIN;

DO $$
DECLARE
  rejected_low boolean := false;
  rejected_high boolean := false;
  rejected_dup boolean := false;
  uid BIGINT;
  mid BIGINT;
BEGIN
  SELECT id INTO uid FROM users WHERE role = 'CUSTOMER' LIMIT 1;
  SELECT id INTO mid FROM movies ORDER BY id LIMIT 1;

  BEGIN
    INSERT INTO reviews (user_id, movie_id, rating, comment)
    VALUES (uid, mid, 0, 'too low');
  EXCEPTION
    WHEN check_violation THEN
      rejected_low := true;
  END;

  BEGIN
    INSERT INTO reviews (user_id, movie_id, rating, comment)
    VALUES (uid, mid, 6, 'too high');
  EXCEPTION
    WHEN check_violation THEN
      rejected_high := true;
  END;

  IF NOT (rejected_low AND rejected_high) THEN
    RAISE EXCEPTION 'expected check_violation for rating 0 and 6';
  END IF;

  INSERT INTO reviews (user_id, movie_id, rating, comment)
  VALUES (uid, mid, 5, 'great');

  BEGIN
    INSERT INTO reviews (user_id, movie_id, rating, comment)
    VALUES (uid, mid, 4, 'again');
  EXCEPTION
    WHEN unique_violation THEN
      rejected_dup := true;
  END;

  IF NOT rejected_dup THEN
    RAISE EXCEPTION 'expected unique_violation on reviews(user_id, movie_id)';
  END IF;
END;
$$;

ROLLBACK;
