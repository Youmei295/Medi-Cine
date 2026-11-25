# Repository Guidelines

## Project Structure

- `backend/` contains the Rust 2024 Axum server. `backend/src/main.rs` starts the process, `config.rs` loads settings, `db.rs` creates the SQLx PostgreSQL pool, and `http/` contains the router and handlers. The root `src/` directory contains a placeholder.
- `docs/api/` contains the target cinema-booking API, its OpenAPI 3.1 contract, usage guide, state and event rules, traceability, and acceptance scenarios. Start with `docs/api/README.md`.
- `pa/pa0/` through `pa/pa3/` contain course deliverables, including requirements, architecture, planning, and weekly reports. Use the cinema requirements baseline listed in `docs/api/DECISIONS.md`.
- `docs/requirements/` holds supplementary requirements, and `docs/test/` is reserved for test documentation.

## Agent Workflow

### Context

- Read [project.md](.agents/context/project.md) when you need the repository layout, requirements baseline, or current setup.
- Read [domain.md](.agents/context/domain.md) before interpreting or changing cinema workflows, roles, or business rules.
- Read [quality-gates.md](.agents/context/quality-gates.md) when choosing checks or reporting validation results.

### Skills

Open the relevant `SKILL.md`. Use multiple skills when their scopes overlap.

- [medicine-cross-layer-change](.agents/skills/medicine-cross-layer-change/SKILL.md) for behavior changes spanning the UI, API, domain logic, or background jobs.
- [medicine-database-change](.agents/skills/medicine-database-change/SKILL.md) for data models, migrations, backfills, constraints, or transactions.
- [medicine-release-readiness](.agents/skills/medicine-release-readiness/SKILL.md) when assessing readiness for a course submission, demo, staging deployment, or release.

### Templates

- Use [task-brief.md](.agents/templates/task-brief.md) when scoping work that needs explicit acceptance criteria and a verification plan.
- Use [handoff.md](.agents/templates/handoff.md) when passing work to another contributor or agent. Record completed work, test evidence, and the next action.

## Build, Test, and Development Commands

The backend uses Cargo and reads `DATABASE_URL` and optional `BIND_ADDR`. See [README.md](README.md#backend-status) for the operational endpoints. Run the API contract validator from the repository root:

```sh
python -m pip install PyYAML openapi-spec-validator jsonschema pypdf
python docs/api/validate_contract.py
```

The first command installs the validator’s dependencies. The second checks the API contract and its supporting documents.

## Coding Style and Naming

Use four-space indentation and `snake_case` for Python functions in the validator. Match the surrounding YAML indentation, use lower camel case for OpenAPI operation IDs (for example, `getSeatMap`), and keep those IDs consistent across the contract, operation guide, and traceability tables. Use rustfmt for Rust code.

## Testing Guidelines

Run the validator after changing the API contract or its supporting documents. It checks schema examples, references, document links, and mappings for all 20 use cases and 90 alternative flows. Keep scenario IDs consistent with `CONTRACT_SCENARIOS.md`, using patterns such as `SC-U01-A01`. Use Cargo for backend tests. When changing startup or database connectivity, verify `/health` and both success and failure responses from `/ready`. Record cinema API acceptance results as those workflows become available.

## Commits and Pull Requests

Use short, imperative commit subjects, following examples such as `Add MEDI-CINE API documentation`. In the PR description, summarize the change, cite affected use cases or decisions, link related issues when available, and report validation results. Include screenshots when changing a user interface or visual deliverable.
