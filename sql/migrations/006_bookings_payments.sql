-- Nhóm 5: Đặt vé và thanh toán (F-07, F-08, F-11)
-- Thứ tự: bookings → showtime_seats → booking_items → payments → refunds

CREATE TABLE bookings (
  id               BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id          BIGINT         NOT NULL,
  promotion_id     BIGINT,
  subtotal         NUMERIC(12, 2) NOT NULL,
  discount_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(12, 2) NOT NULL,
  status           VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ    NOT NULL,
  CONSTRAINT pk_bookings PRIMARY KEY (id),
  CONSTRAINT fk_bookings_user_id
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_promotion_id
    FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE RESTRICT,
  CONSTRAINT ck_bookings_status CHECK (
    status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED')
  ),
  CONSTRAINT ck_bookings_subtotal CHECK (subtotal >= 0),
  CONSTRAINT ck_bookings_discount_amount CHECK (discount_amount >= 0),
  CONSTRAINT ck_bookings_total_amount CHECK (total_amount >= 0),
  CONSTRAINT ck_bookings_totals CHECK (
    total_amount = subtotal - discount_amount
    AND discount_amount <= subtotal
  )
);

CREATE TABLE showtime_seats (
  id               BIGINT GENERATED ALWAYS AS IDENTITY,
  showtime_id      BIGINT       NOT NULL,
  seat_id          BIGINT       NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE',
  held_booking_id  BIGINT,
  held_until       TIMESTAMPTZ,
  CONSTRAINT pk_showtime_seats PRIMARY KEY (id),
  CONSTRAINT uq_showtime_seats_showtime_seat UNIQUE (showtime_id, seat_id),
  CONSTRAINT fk_showtime_seats_showtime_id
    FOREIGN KEY (showtime_id) REFERENCES showtimes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_showtime_seats_seat_id
    FOREIGN KEY (seat_id) REFERENCES seats (id) ON DELETE RESTRICT,
  CONSTRAINT fk_showtime_seats_held_booking_id
    FOREIGN KEY (held_booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
  CONSTRAINT ck_showtime_seats_status CHECK (
    status IN ('AVAILABLE', 'HELD', 'SOLD')
  ),
  CONSTRAINT ck_showtime_seats_held_fields CHECK (
    (status = 'HELD'
      AND held_booking_id IS NOT NULL
      AND held_until IS NOT NULL)
    OR (status = 'AVAILABLE'
      AND held_booking_id IS NULL
      AND held_until IS NULL)
    OR (status = 'SOLD')
  )
);

CREATE TABLE booking_items (
  id                BIGINT GENERATED ALWAYS AS IDENTITY,
  booking_id        BIGINT         NOT NULL,
  showtime_seat_id  BIGINT         NOT NULL,
  price             NUMERIC(12, 2) NOT NULL,
  status            VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT pk_booking_items PRIMARY KEY (id),
  CONSTRAINT fk_booking_items_booking_id
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_items_showtime_seat_id
    FOREIGN KEY (showtime_seat_id) REFERENCES showtime_seats (id) ON DELETE RESTRICT,
  CONSTRAINT ck_booking_items_status CHECK (status IN ('ACTIVE', 'RELEASED')),
  CONSTRAINT ck_booking_items_price CHECK (price >= 0)
);

CREATE UNIQUE INDEX uq_booking_items_active_showtime_seat
  ON booking_items (showtime_seat_id)
  WHERE status = 'ACTIVE';

CREATE TABLE payments (
  id               BIGINT GENERATED ALWAYS AS IDENTITY,
  booking_id       BIGINT         NOT NULL,
  gateway          VARCHAR(50)    NOT NULL,
  transaction_ref  VARCHAR(255)   NOT NULL,
  amount           NUMERIC(12, 2) NOT NULL,
  status           VARCHAR(30)    NOT NULL DEFAULT 'PENDING',
  paid_at          TIMESTAMPTZ,
  raw_response     JSONB,
  CONSTRAINT pk_payments PRIMARY KEY (id),
  CONSTRAINT uq_payments_gateway_transaction_ref UNIQUE (gateway, transaction_ref),
  CONSTRAINT fk_payments_booking_id
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
  CONSTRAINT ck_payments_amount CHECK (amount > 0),
  CONSTRAINT ck_payments_status CHECK (
    status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')
  )
);

CREATE TABLE refunds (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY,
  payment_id          BIGINT         NOT NULL,
  processed_by        BIGINT         NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL,
  reason              TEXT,
  status              VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
  gateway_refund_ref  VARCHAR(255),
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ,
  CONSTRAINT pk_refunds PRIMARY KEY (id),
  CONSTRAINT fk_refunds_payment_id
    FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_refunds_processed_by
    FOREIGN KEY (processed_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT ck_refunds_amount CHECK (amount > 0),
  CONSTRAINT ck_refunds_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED'))
);
