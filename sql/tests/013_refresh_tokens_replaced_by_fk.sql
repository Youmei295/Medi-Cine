-- Expect: replaced_by pointing to missing id rejected
BEGIN;

DO $$
DECLARE
  rejected boolean := false;
  uid BIGINT;
  tok BIGINT;
BEGIN
  SELECT id INTO uid FROM users ORDER BY id LIMIT 1;

  INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
  VALUES (uid, 'hash-rt-base-001', now() + interval '7 days')
  RETURNING id INTO tok;

  BEGIN
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, replaced_by)
    VALUES (uid, 'hash-rt-bad-ref', now() + interval '7 days', tok + 999999);
  EXCEPTION
    WHEN foreign_key_violation THEN
      rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'expected foreign_key_violation on refresh_tokens.replaced_by';
  END IF;
END;
$$;

ROLLBACK;
