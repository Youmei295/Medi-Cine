-- Expect: total_amount != subtotal - discount_amount rejected
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  uid BIGINT;
BEGIN
  SELECT id INTO uid FROM users WHERE role = 'CUSTOMER' LIMIT 1;

  BEGIN
    INSERT INTO bookings (user_id, subtotal, discount_amount, total_amount, status, expires_at)
    VALUES (uid, 100000, 10000, 95000, 'PENDING', now() + interval '15 minutes');
  EXCEPTION
    WHEN check_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected check_violation for mismatched booking totals';
  END IF;
END;
$$;

ROLLBACK;
