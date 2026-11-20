"""Document-only verification. Run from any directory; no backend/network calls.

Requires PyYAML, openapi-spec-validator, jsonschema, pypdf.
"""
from __future__ import annotations

from datetime import datetime
import importlib.metadata
import json
from pathlib import Path
import re
import sys
import warnings

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate_spec
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
API = Path(__file__).resolve().parent
METHODS = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}
REQUIRED_FILES = {
    "README.md", "openapi.yaml", "API_GUIDE.md", "TRACEABILITY.md",
    "STATE_AND_EVENTS.md", "DECISIONS.md", "CONTRACT_SCENARIOS.md",
    "validate_contract.py",
}
SOURCES = [
    "pa/pa3/Use_Case_Specification_v1.1.pdf",
    "pa/pa3/Software_Architecture_Document_v1.1.pdf",
    "pa/pa2/Vision_Document_v1.2.pdf",
    "pa/pa2/Software_Development_Plan_v2.0.pdf",
]


class UniqueLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, val_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f"Duplicate YAML mapping key: {key}")
        result[key] = loader.construct_object(val_node, deep=deep)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def walk(value, loc="$"):
    if isinstance(value, dict):
        yield loc, value
        for key, child in value.items():
            yield from walk(child, f"{loc}/{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk(child, f"{loc}/{index}")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def resolve(document, pointer):
    require(pointer.startswith("#/"), f"External reference disallowed: {pointer}")
    value = document
    for token in pointer[2:].split("/"):
        value = value[token.replace("~1", "/").replace("~0", "~")]
    return value


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    require(all((API / f).is_file() for f in REQUIRED_FILES), "Missing required deliverables")
    for pkg in ["PyYAML", "openapi-spec-validator", "jsonschema", "pypdf"]:
        print(f"TOOL {pkg}=={importlib.metadata.version(pkg)}")
    document = yaml.load((API / "openapi.yaml").read_text(encoding="utf-8"), Loader=UniqueLoader)
    validate_spec(document)
    print("PASS OpenAPI 3.1 structural/spec validation (not only YAML parsing)")

    refs = 0
    for loc, node in walk(document):
        if "$ref" in node:
            resolve(document, node["$ref"])
            refs += 1
    require(refs > 0, "No references checked")
    operations = []
    for path, item in document["paths"].items():
        for method, operation in item.items():
            if method not in METHODS:
                continue
            operations.append(operation)
            parameters = operation.get("parameters", [])
            path_params = {p["name"] for p in parameters if p["in"] == "path" and p.get("required")}
            require(path_params == set(re.findall(r"{(.*?)}", path)), f"Path parameters {method} {path}")
            require(len({(p['in'], p['name']) for p in parameters}) == len(parameters), "Duplicate parameter")
            require(operation.get("x-status") in {"PROPOSED", "OPTIONAL"}, "Unsupported status")
            require(operation.get("x-source") and "x-roles" in operation, "Missing source/role")
            if operation["x-roles"] in [["PUBLIC"], ["PROVIDER"]]:
                require(operation["security"] == [], "Public/provider must not require Customer login")
            else:
                require(operation["security"] == [{"sessionToken": []}], "Protected operation has no bearer")
            if operation.get("x-idempotency") == "REQUIRED":
                require(any(p["name"] == "Idempotency-Key" and p.get("required") for p in parameters), "Missing retry header")
    ids = [operation["operationId"] for operation in operations]
    require(len(ids) == len(set(ids)), "Duplicate operationId")
    require(set().union(*(set(o["x-uc"]) for o in operations)) == {f"UC{u:02}" for u in range(1, 21)}, "HTTP UC coverage")
    for operation in operations:
        if set(operation["x-uc"]) & {"UC17", "UC20"} and operation["operationId"] not in {"getNotification"}:
            require(operation["x-status"] == "OPTIONAL", "Optional UC accidentally core")
    print(f"PASS {len(ids)} unique operations, required path parameters/security, {refs} resolved local refs")

    # Root validator retains the full document for local #/components/... refs.
    root_schema = dict(document, **{"$schema": "https://json-schema.org/draft/2020-12/schema"})
    root_validator = Draft202012Validator(root_schema, format_checker=FormatChecker())
    for name, schema in document["components"]["schemas"].items():
        Draft202012Validator.check_schema(schema)
    examples = 0
    for loc, node in walk(document):
        if "schema" not in node:
            continue
        schema = node["schema"]
        values = []
        if "example" in node:
            values.append(node["example"])
        for example in node.get("examples", {}).values():
            if isinstance(example, dict) and "value" in example:
                values.append(example["value"])
        for value in values:
            errors = list(root_validator.evolve(schema=schema).iter_errors(value))
            require(not errors, f"Invalid example at {loc}: " + "; ".join(e.message for e in errors))
            examples += 1
    require(examples >= len(ids), "Too few media/parameter examples validated")
    print(f"PASS {len(document['components']['schemas'])} JSON Schemas; {examples} request/response/parameter/header examples with format checks")

    def operation(operation_id):
        return next(o for o in operations if o['operationId'] == operation_id)

    def example(operation_id, code):
        return operation(operation_id)['responses'][code]['content']['application/json']['example']

    # Semantic fixture checks: schema correctness alone cannot catch these.
    pending_payment = example('initiatePayment', '202')
    require(pending_payment['sessionStatus'] in {'CREATING', 'UNAVAILABLE'} and pending_payment['checkoutUrl'] is None,
            'Uncertain payment202 must not advertise a READY checkout URL')
    booking = example('createBooking', '201')
    tickets = example('listBookingTickets', '200')
    expected_seats = {line['seatId'] for line in booking['quoteSnapshot']['items']}
    require({t['seatId'] for t in tickets['items']} == expected_seats and len(tickets['items']) == len(expected_seats),
            'READY ticket page must cover every committed fixture seat exactly once')
    require(tickets['nextCursor'] is None and len({t['id'] for t in tickets['items']}) == len(tickets['items']),
            'READY fixture ticket list must be complete and unique')
    require(all(t['bookingId'] == booking['id'] and t['showtimeId'] == booking['quoteSnapshot']['showtimeId'] for t in tickets['items']),
            'Ticket/booking/showtime fixture relationship mismatch')
    recorded_at = datetime.fromisoformat(example('confirmAdmission', '201')['recordedAt'].replace('Z', '+00:00'))
    for operation_id in ['getDashboard', 'getReport']:
        report = example(operation_id, '200')
        as_of = datetime.fromisoformat(report['asOf'].replace('Z', '+00:00'))
        require(report['admissions'] == 0 or as_of >= recorded_at, 'Report cannot include an admission after its asOf')
        require(report['revenue'] == booking['quoteSnapshot']['total'], 'Fixture revenue double-counted or mismatched')
        require(report['ticketsSold'] == len(expected_seats), 'Fixture ticketsSold mismatch')
    geometry_media = operation('getSeatMap')['responses']['200']['content']['application/json']
    geometry = geometry_media['examples']['geometryWithAisle']['value']
    coords = {(s['row'], s['number']) for s in geometry['seats']}
    require(len(coords) == len(geometry['seats']), 'Duplicate geometry coordinate')
    require(all(1 <= row <= geometry['rows'] and 1 <= col <= geometry['columns'] for row, col in coords), 'Geometry out of grid bounds')
    require((1, 2) not in coords and (2, 2) not in coords and geometry['rows'] >= 2, 'Aisle/multi-row fixture missing')
    require(any(s['operationalStatus'] == 'OUT_OF_SERVICE' and s['state'] is None and s['price'] is None for s in geometry['seats']),
            'Out-of-service public geometry must remain positioned/nonselectable')
    require(geometry['screenPosition'] == 'FRONT_ROW_1', 'Screen axis convention mismatch')

    profile_validator = root_validator.evolve(schema={'$ref': '#/components/schemas/ProfileInput'})
    require(profile_validator.is_valid({'displayName': 'New Name'}), 'Profile has no valid documented update')
    require(not profile_validator.is_valid({'displayName': 'New Name', 'expectedVersion': 1}), 'Unversioned profile must reject phantom version')
    showtime_validator = root_validator.evolve(schema={'$ref': '#/components/schemas/ShowtimeUpdate'})
    require(not showtime_validator.is_valid({'expectedVersion': 1, 'status': 'DRAFT'}), 'Showtime demotion loophole')
    require(showtime_validator.is_valid({'expectedVersion': 1, 'status': 'ACTIVE'}), 'Activation request must be representable')
    for forbidden in ['SHOWTIME_TERMINAL', 'SHOWTIME_HAS_RESERVATIONS']:
        require(forbidden in operation('updateShowtime')['responses']['409']['x-error-codes'], 'Missing showtime lifecycle rejection')
    print('PASS semantic payment/ticket/report/geometry fixtures and negative profile/showtime request checks')

    trace = (API / "TRACEABILITY.md").read_text(encoding="utf-8")
    scenarios = (API / "CONTRACT_SCENARIOS.md").read_text(encoding="utf-8")
    guide = (API / "API_GUIDE.md").read_text(encoding="utf-8")
    readme = (API / "README.md").read_text(encoding="utf-8")
    for operation_id in ids:
        require(f"### {operation_id}\n" in guide, f"Missing guide operation {operation_id}")
        require(f"`{operation_id}`" in readme and f"`{operation_id}`" in trace, f"Missing catalogue/reverse mapping {operation_id}")
    uc_reader = PdfReader(ROOT / SOURCES[0])
    alternative_source = set()
    for page in uc_reader.pages[10:]:
        for line in page.extract_text().splitlines():
            match = re.match(r"^\s*(\d+)\.2\.2\.(\d+)\s+\D", line)
            if match:
                alternative_source.add(tuple(map(int, match.groups())))
    alternative_doc = {tuple(map(int, m)) for m in re.findall(r"§(\d+)\.2\.2\.(\d+)", trace)}
    require(len(alternative_source) == 90, f"Source alternative count changed: {len(alternative_source)}")
    require(alternative_doc == alternative_source, f"Alternative coverage difference: {alternative_source ^ alternative_doc}")
    require(set(re.findall(r"### UC(\d{2})", trace)) == {f"{u:02}" for u in range(1, 21)}, "Missing basic UC section")
    require({int(u) for u in re.findall(r"§(\d+)\.2\.1 steps", trace)} == set(range(1, 21)), "Missing basic flow mapping")
    declared_scenarios = re.findall(r"^\| (SC-[A-Z0-9-]+)(?: /| \|)", scenarios, re.M)
    require(len(declared_scenarios) == len(set(declared_scenarios)), "Duplicate scenario ID")
    required_scenarios = set(re.findall(r"SC-(?:U\d{2}-[AB]\d{2}|X-[A-Z0-9-]+)", trace))
    require(required_scenarios <= set(declared_scenarios), f"Unknown scenario IDs: {required_scenarios - set(declared_scenarios)}")
    require(set(re.findall(r'^\| (NFR-\d{2}) ', trace, re.M)) == {f'NFR-{n:02}' for n in range(1, 11)}, 'Missing planned NFR acceptance matrix row')
    print(f"PASS 20/20 UC basic sections; 90/90 actual PDF alternative IDs; {len(declared_scenarios)} unique scenarios; {len(ids)}/{len(ids)} reverse mappings")

    link_count = 0
    for md in API.glob("*.md"):
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", md.read_text(encoding="utf-8")):
            if "://" in target or target.startswith("#"):
                continue
            path = target.split("#")[0].strip("<>")
            require((md.parent / path).is_file(), f"Broken local link in {md.name}: {path}")
            link_count += 1
    require(document['components']['schemas']['BookingStatus']['enum'] == ['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'], "Booking enum drift")
    require(document['components']['schemas']['TicketStatus']['enum'] == ['UNUSED', 'USED', 'CANCELLED'], "Ticket enum drift")
    require(document['components']['schemas']['SeatState']['enum'] == ['AVAILABLE', 'HELD', 'SOLD'], "Seat enum drift")
    print(f"PASS {link_count} relative document links; canonical booking/ticket/seat enums")

    print("RESULT PASS (contract-only; backend/load/latency NOT RUN)")


if __name__ == "__main__":
    main()
