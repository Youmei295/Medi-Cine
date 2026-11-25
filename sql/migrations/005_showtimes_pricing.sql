-- Nhóm 4: Lịch chiếu và giá (F-04, F-05, F-13)
-- showtimes trước; showtime_seats tạo ở 006 vì FK tới bookings.

CREATE TABLE showtimes (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  movie_id        BIGINT       NOT NULL,
  room_id         BIGINT       NOT NULL,
  start_time      TIMESTAMPTZ  NOT NULL,
  end_time        TIMESTAMPTZ  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
  CONSTRAINT pk_showtimes PRIMARY KEY (id),
  CONSTRAINT fk_showtimes_movie_id
    FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_showtimes_room_id
    FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT,
  CONSTRAINT ck_showtimes_status CHECK (
    status IN ('DRAFT', 'ACTIVE', 'CANCELLED', 'FINISHED')
  ),
  CONSTRAINT ck_showtimes_end_after_start CHECK (end_time > start_time),
  CONSTRAINT ex_showtimes_no_overlap
    EXCLUDE USING gist (
      room_id WITH =,
      tstzrange(start_time, end_time) WITH &&
    )
    WHERE (status <> 'CANCELLED')
);

CREATE TABLE price_rules (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  seat_type_id    BIGINT         NOT NULL,
  day_type        VARCHAR(20)    NOT NULL,
  from_time       TIME           NOT NULL,
  to_time         TIME           NOT NULL,
  priority        INTEGER        NOT NULL DEFAULT 0,
  effective_from  DATE           NOT NULL,
  effective_to    DATE,
  price           NUMERIC(12, 2) NOT NULL,
  CONSTRAINT pk_price_rules PRIMARY KEY (id),
  CONSTRAINT fk_price_rules_seat_type_id
    FOREIGN KEY (seat_type_id) REFERENCES seat_types (id) ON DELETE RESTRICT,
  CONSTRAINT ck_price_rules_day_type CHECK (day_type IN ('WEEKDAY', 'WEEKEND')),
  CONSTRAINT ck_price_rules_price CHECK (price >= 0),
  CONSTRAINT ck_price_rules_effective_range CHECK (
    effective_to IS NULL OR effective_to >= effective_from
  )
);

CREATE TABLE promotions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  code            VARCHAR(50)    NOT NULL,
  discount_type   VARCHAR(20)    NOT NULL,
  discount_value  NUMERIC(12, 2) NOT NULL,
  min_order       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_at        TIMESTAMPTZ    NOT NULL,
  end_at          TIMESTAMPTZ    NOT NULL,
  usage_limit     INTEGER,
  per_user_limit  INTEGER,
  status          VARCHAR(20)    NOT NULL,
  CONSTRAINT pk_promotions PRIMARY KEY (id),
  CONSTRAINT uq_promotions_code UNIQUE (code),
  CONSTRAINT ck_promotions_discount_type CHECK (discount_type IN ('PERCENT', 'FIXED')),
  CONSTRAINT ck_promotions_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT ck_promotions_end_after_start CHECK (end_at > start_at),
  CONSTRAINT ck_promotions_min_order CHECK (min_order >= 0),
  CONSTRAINT ck_promotions_discount_value CHECK (
    discount_value >= 0
    AND (
      discount_type <> 'PERCENT'
      OR (discount_value > 0 AND discount_value <= 100)
    )
  )
);
