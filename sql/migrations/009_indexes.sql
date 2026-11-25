-- Indexes (mục 9 agent.md). Unique/PK indexes đã tạo ở các file trước.

CREATE INDEX ix_showtimes_movie_id
  ON showtimes (movie_id);

CREATE INDEX ix_showtimes_room_id_start_time
  ON showtimes (room_id, start_time);

CREATE INDEX ix_showtimes_status_start_time
  ON showtimes (status, start_time);

CREATE INDEX ix_seats_room_id
  ON seats (room_id);

CREATE INDEX ix_booking_items_booking_id
  ON booking_items (booking_id);

CREATE INDEX ix_payments_booking_id
  ON payments (booking_id);

CREATE INDEX ix_refunds_payment_id
  ON refunds (payment_id);

CREATE INDEX ix_ticket_scans_ticket_id
  ON ticket_scans (ticket_id);

CREATE INDEX ix_reviews_movie_id
  ON reviews (movie_id);

CREATE INDEX ix_email_logs_user_id
  ON email_logs (user_id);

CREATE INDEX ix_email_logs_booking_id
  ON email_logs (booking_id);

CREATE INDEX ix_email_logs_status_scheduled_at
  ON email_logs (status, scheduled_at);

CREATE INDEX ix_refresh_tokens_user_id
  ON refresh_tokens (user_id);

CREATE INDEX ix_showtime_seats_status_held_until
  ON showtime_seats (status, held_until);

CREATE INDEX ix_bookings_status_expires_at
  ON bookings (status, expires_at);

CREATE INDEX ix_bookings_promotion_id_status
  ON bookings (promotion_id, status);

CREATE INDEX ix_bookings_user_id_promotion_id
  ON bookings (user_id, promotion_id);

CREATE INDEX ix_audit_logs_entity_type_entity_id
  ON audit_logs (entity_type, entity_id);

CREATE INDEX ix_movies_status
  ON movies (status);
