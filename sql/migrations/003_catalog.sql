-- Nhóm 2: Danh mục phim (F-02, F-06)

CREATE TABLE movies (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  duration_min    INTEGER      NOT NULL,
  age_rating      VARCHAR(20),
  release_date    DATE,
  poster_url      VARCHAR(1024),
  trailer_url     VARCHAR(1024),
  status          VARCHAR(20)  NOT NULL DEFAULT 'COMING_SOON',
  CONSTRAINT pk_movies PRIMARY KEY (id),
  CONSTRAINT ck_movies_duration_min CHECK (duration_min > 0),
  CONSTRAINT ck_movies_status CHECK (
    status IN ('COMING_SOON', 'NOW_SHOWING', 'ENDED', 'INACTIVE')
  )
);

CREATE TABLE genres (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  name            VARCHAR(100) NOT NULL,
  CONSTRAINT pk_genres PRIMARY KEY (id),
  CONSTRAINT uq_genres_name UNIQUE (name)
);

CREATE TABLE movie_genres (
  movie_id        BIGINT NOT NULL,
  genre_id        BIGINT NOT NULL,
  CONSTRAINT pk_movie_genres PRIMARY KEY (movie_id, genre_id),
  CONSTRAINT fk_movie_genres_movie_id
    FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE,
  CONSTRAINT fk_movie_genres_genre_id
    FOREIGN KEY (genre_id) REFERENCES genres (id) ON DELETE CASCADE
);
