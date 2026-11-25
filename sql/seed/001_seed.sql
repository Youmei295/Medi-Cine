-- Idempotent seed for local/dev. password_hash values are FAKE placeholders, not for production.
-- Re-run safe via ON CONFLICT DO NOTHING.

-- Users: 1 CUSTOMER, 1 STAFF, 1 ADMIN
INSERT INTO users (id, email, password_hash, full_name, phone, role, status)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'customer@example.com', '$2b$12$SEED_FAKE_HASH_CUSTOMER_NOT_FOR_PROD', 'Nguyen Van A', '0901000001', 'CUSTOMER', 'ACTIVE'),
  (2, 'staff@example.com',    '$2b$12$SEED_FAKE_HASH_STAFF_NOT_FOR_PROD',    'Tran Thi B',   '0901000002', 'STAFF',    'ACTIVE'),
  (3, 'admin@example.com',    '$2b$12$SEED_FAKE_HASH_ADMIN_NOT_FOR_PROD',    'Le Van C',     '0901000003', 'ADMIN',    'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT MAX(id) FROM users), 1));

-- Genres
INSERT INTO genres (id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Action'),
  (2, 'Drama'),
  (3, 'Comedy')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('genres', 'id'), GREATEST((SELECT MAX(id) FROM genres), 1));

-- Movies
INSERT INTO movies (id, title, description, duration_min, age_rating, release_date, poster_url, trailer_url, status)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Night Runner',  'An undercover agent races against time.', 120, 'T16', '2026-01-10', 'https://example.com/p/night.jpg',  'https://example.com/t/night',  'NOW_SHOWING'),
  (2, 'Quiet Harbor',  'A coastal town hides a long-kept secret.', 105, 'T13', '2026-02-01', 'https://example.com/p/harbor.jpg', 'https://example.com/t/harbor', 'NOW_SHOWING'),
  (3, 'Star Picnic',   'Friends reunite under the summer sky.',     95, 'P',   '2026-06-01', 'https://example.com/p/picnic.jpg', 'https://example.com/t/picnic', 'COMING_SOON')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('movies', 'id'), GREATEST((SELECT MAX(id) FROM movies), 1));

INSERT INTO movie_genres (movie_id, genre_id)
VALUES
  (1, 1), (1, 2),
  (2, 2),
  (3, 3)
ON CONFLICT DO NOTHING;

-- Rooms & seat types
INSERT INTO rooms (id, name, format, status)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Room A', '2D', 'ACTIVE'),
  (2, 'Room B', 'IMAX', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('rooms', 'id'), GREATEST((SELECT MAX(id) FROM rooms), 1));

INSERT INTO seat_types (id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Standard'),
  (2, 'VIP'),
  (3, 'Couple')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('seat_types', 'id'), GREATEST((SELECT MAX(id) FROM seat_types), 1));

-- ~20 seats per room (rows A-D, seat_number 1-5; col_index leaves aisle gap at 3)
INSERT INTO seats (room_id, seat_type_id, row_label, seat_number, col_index, is_active)
SELECT
  r.id,
  CASE
    WHEN s.seat_number <= 2 THEN 1
    WHEN s.seat_number <= 4 THEN 2
    ELSE 3
  END,
  chr(64 + s.row_n),
  s.seat_number,
  CASE WHEN s.seat_number <= 2 THEN s.seat_number ELSE s.seat_number + 1 END,
  TRUE
FROM rooms r
CROSS JOIN (
  SELECT row_n, seat_number
  FROM generate_series(1, 4) AS row_n
  CROSS JOIN generate_series(1, 5) AS seat_number
) s
ON CONFLICT (room_id, row_label, seat_number) DO NOTHING;

-- Price rules: WEEKDAY/WEEKEND for each seat type; overlapping pair on Standard WEEKDAY for priority test
INSERT INTO price_rules (id, seat_type_id, day_type, from_time, to_time, priority, effective_from, effective_to, price)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 1, 'WEEKDAY', '09:00', '17:00', 0, '2026-01-01', NULL,         70000.00),
  (2, 1, 'WEEKDAY', '09:00', '17:00', 10, '2026-01-01', '2026-12-31', 65000.00), -- higher priority overlap
  (3, 1, 'WEEKDAY', '17:00', '23:00', 0, '2026-01-01', NULL,         85000.00),
  (4, 1, 'WEEKEND', '09:00', '23:00', 0, '2026-01-01', NULL,         95000.00),
  (5, 2, 'WEEKDAY', '09:00', '23:00', 0, '2026-01-01', NULL,        120000.00),
  (6, 2, 'WEEKEND', '09:00', '23:00', 0, '2026-01-01', NULL,        140000.00),
  (7, 3, 'WEEKDAY', '09:00', '23:00', 0, '2026-01-01', NULL,        180000.00),
  (8, 3, 'WEEKEND', '09:00', '23:00', 0, '2026-01-01', NULL,        200000.00)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('price_rules', 'id'), GREATEST((SELECT MAX(id) FROM price_rules), 1));

-- Two non-overlapping ACTIVE showtimes in Room A
INSERT INTO showtimes (id, movie_id, room_id, start_time, end_time, status)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 1, 1, '2026-11-26 10:00:00+00', '2026-11-26 12:30:00+00', 'ACTIVE'),
  (2, 2, 1, '2026-11-26 13:00:00+00', '2026-11-26 15:15:00+00', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('showtimes', 'id'), GREATEST((SELECT MAX(id) FROM showtimes), 1));

-- showtime_seats for both showtimes
INSERT INTO showtime_seats (showtime_id, seat_id, status, held_booking_id, held_until)
SELECT st.id, s.id, 'AVAILABLE', NULL, NULL
FROM showtimes st
JOIN seats s ON s.room_id = st.room_id
WHERE st.id IN (1, 2)
ON CONFLICT (showtime_id, seat_id) DO NOTHING;

-- Promotions: one PERCENT, one FIXED
INSERT INTO promotions (
  id, code, discount_type, discount_value, min_order, start_at, end_at,
  usage_limit, per_user_limit, status
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'SAVE10', 'PERCENT', 10.00, 0,       '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', 100, 2,    'ACTIVE'),
  (2, 'FLAT20K','FIXED',   20000.00, 100000,'2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', NULL, NULL, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('promotions', 'id'), GREATEST((SELECT MAX(id) FROM promotions), 1));
