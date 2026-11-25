-- Nhóm 1: Tài khoản và bảo mật (F-01)

CREATE TABLE users (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(30),
  role            VARCHAR(20)  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT pk_users PRIMARY KEY (id),
  CONSTRAINT ck_users_role CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN')),
  CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'LOCKED'))
);

CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));

CREATE TABLE refresh_tokens (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id         BIGINT       NOT NULL,
  token_hash      VARCHAR(255) NOT NULL,
  expires_at      TIMESTAMPTZ  NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  replaced_by     BIGINT,
  user_agent      VARCHAR(512),
  ip              VARCHAR(64),
  CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
  CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash),
  CONSTRAINT fk_refresh_tokens_user_id
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_refresh_tokens_replaced_by
    FOREIGN KEY (replaced_by) REFERENCES refresh_tokens (id) ON DELETE RESTRICT
);
