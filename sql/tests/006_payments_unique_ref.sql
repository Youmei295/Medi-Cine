-- Expect: duplicate (gateway, transaction_ref) rejected
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  uid BIGINT;
  bid BIGINT;
BEGIN
  SELECT id INTO uid FROM users WHERE role = 'CUSTOMER' LIMIT 1;

  INSERT INTO bookings (user_id, subtotal, discount_amount, total_amount, status, expires_at)
  VALUES (uid, 50000, 0, 50000, 'PENDING', now() + interval '15 minutes')
  RETURNING id INTO bid;

  INSERT INTO payments (booking_id, gateway, transaction_ref, amount, status)
  VALUES (bid, 'SANDBOX', 'TX-DUP-001', 50000, 'PENDING');

  BEGIN
    INSERT INTO payments (booking_id, gateway, transaction_ref, amount, status)
    VALUES (bid, 'SANDBOX', 'TX-DUP-001', 50000, 'PENDING');
  EXCEPTION
    WHEN unique_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected unique_violation on payments(gateway, transaction_ref)';
  END IF;
END;
$$;

ROLLBACK;
