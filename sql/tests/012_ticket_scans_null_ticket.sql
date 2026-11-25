-- Expect: ticket_scans with ticket_id NULL allowed
BEGIN;

DO $$
DECLARE
  staff_id BIGINT;
BEGIN
  SELECT id INTO staff_id FROM users WHERE role = 'STAFF' LIMIT 1;

  INSERT INTO ticket_scans (ticket_id, scanned_by, scanned_code, result)
  VALUES (NULL, staff_id, 'UNKNOWN-CODE-XYZ', 'INVALID');
END;
$$;

ROLLBACK;
