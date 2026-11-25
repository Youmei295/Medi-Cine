-- Nhóm 7: Tương tác và hệ thống (F-12, F-14)

CREATE TABLE reviews (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id         BIGINT       NOT NULL,
  movie_id        BIGINT       NOT NULL,
  rating          INTEGER      NOT NULL,
  comment         TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT pk_reviews PRIMARY KEY (id),
  CONSTRAINT uq_reviews_user_movie UNIQUE (user_id, movie_id),
  CONSTRAINT fk_reviews_user_id
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_movie_id
    FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE RESTRICT,
  CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE email_logs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id         BIGINT       NOT NULL,
  booking_id      BIGINT,
  type            VARCHAR(40)  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  CONSTRAINT pk_email_logs PRIMARY KEY (id),
  CONSTRAINT fk_email_logs_user_id
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_email_logs_booking_id
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
  CONSTRAINT ck_email_logs_type CHECK (
    type IN (
      'BOOKING_CONFIRMATION',
      'PAYMENT_UPDATE',
      'E_TICKET',
      'SHOWTIME_REMINDER'
    )
  ),
  CONSTRAINT ck_email_logs_status CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE TABLE audit_logs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  actor_id        BIGINT,
  entity_type     VARCHAR(50)  NOT NULL,
  entity_id       BIGINT       NOT NULL,
  action          VARCHAR(50)  NOT NULL,
  old_value       JSONB,
  new_value       JSONB,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT pk_audit_logs PRIMARY KEY (id),
  CONSTRAINT fk_audit_logs_actor_id
    FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE RESTRICT
);
