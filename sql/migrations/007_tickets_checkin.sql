-- Nhóm 6: Vé và check-in (F-09, F-10)

CREATE TABLE tickets (
  id               BIGINT GENERATED ALWAYS AS IDENTITY,
  booking_item_id  BIGINT       NOT NULL,
  qr_code          VARCHAR(255) NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'VALID',
  issued_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  used_at          TIMESTAMPTZ,
  CONSTRAINT pk_tickets PRIMARY KEY (id),
  CONSTRAINT uq_tickets_booking_item_id UNIQUE (booking_item_id),
  CONSTRAINT uq_tickets_qr_code UNIQUE (qr_code),
  CONSTRAINT fk_tickets_booking_item_id
    FOREIGN KEY (booking_item_id) REFERENCES booking_items (id) ON DELETE RESTRICT,
  CONSTRAINT ck_tickets_status CHECK (status IN ('VALID', 'USED', 'CANCELLED')),
  CONSTRAINT ck_tickets_used_at CHECK (used_at IS NULL OR status = 'USED')
);

CREATE TABLE ticket_scans (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  ticket_id       BIGINT,
  scanned_by      BIGINT       NOT NULL,
  scanned_code    VARCHAR(255) NOT NULL,
  result          VARCHAR(20)  NOT NULL,
  scanned_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT pk_ticket_scans PRIMARY KEY (id),
  CONSTRAINT fk_ticket_scans_ticket_id
    FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ticket_scans_scanned_by
    FOREIGN KEY (scanned_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT ck_ticket_scans_result CHECK (result IN ('VALID', 'USED', 'INVALID'))
);
