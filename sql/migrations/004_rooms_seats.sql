-- Nhóm 3: Phòng và ghế (F-03)

CREATE TABLE rooms (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  name            VARCHAR(100) NOT NULL,
  format          VARCHAR(20)  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT pk_rooms PRIMARY KEY (id),
  CONSTRAINT uq_rooms_name UNIQUE (name),
  CONSTRAINT ck_rooms_status CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE'))
);

CREATE TABLE seat_types (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  name            VARCHAR(100) NOT NULL,
  CONSTRAINT pk_seat_types PRIMARY KEY (id),
  CONSTRAINT uq_seat_types_name UNIQUE (name)
);

CREATE TABLE seats (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  room_id         BIGINT       NOT NULL,
  seat_type_id    BIGINT       NOT NULL,
  row_label       VARCHAR(10)  NOT NULL,
  seat_number     INTEGER      NOT NULL,
  col_index       INTEGER      NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT pk_seats PRIMARY KEY (id),
  CONSTRAINT uq_seats_room_row_number UNIQUE (room_id, row_label, seat_number),
  CONSTRAINT fk_seats_room_id
    FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT,
  CONSTRAINT fk_seats_seat_type_id
    FOREIGN KEY (seat_type_id) REFERENCES seat_types (id) ON DELETE RESTRICT
);
