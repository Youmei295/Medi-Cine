SHELL := /bin/bash
.PHONY: up down psql migrate seed test reset

up:
	docker compose up -d
	@echo "Waiting for postgres health..."
	@until docker compose exec -T postgres pg_isready -U "$${POSTGRES_USER:-medi_cine}" -d "$${POSTGRES_DB:-medi_cine}" >/dev/null 2>&1; do sleep 1; done
	@echo "Postgres is ready."

down:
	docker compose down

psql:
	docker compose exec postgres psql -U "$${POSTGRES_USER:-medi_cine}" -d "$${POSTGRES_DB:-medi_cine}"

migrate:
	bash scripts/migrate.sh

seed:
	bash scripts/seed.sh

test:
	bash scripts/test_db.sh

# Dev-only: destroys the named volume. Requires CONFIRM=yes
reset:
	@if [ "$(CONFIRM)" != "yes" ]; then \
		echo "Refusing to reset. Re-run with: make reset CONFIRM=yes"; \
		exit 1; \
	fi
	docker compose down -v
	$(MAKE) up
	$(MAKE) migrate
	$(MAKE) seed
