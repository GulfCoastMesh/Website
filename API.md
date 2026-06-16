# Gulf Coast Mesh Monitor — Public HTTP API

REST API for the public website features: prefix reservation, network reports, and duplicate-prefix detection. Admin-only routes (reservation lists, force-release) require an API key when configured.

**Production base URL:** [https://meshbuddy.gulfcoastmesh.org](https://meshbuddy.gulfcoastmesh.org) — API routes are under `/api` (e.g. `https://meshbuddy.gulfcoastmesh.org/api/status`).

**Local development:** `http://127.0.0.1:5000` (`api_port` in `config.ini`; website uses `api_base_url` on port 8080).

**Format:** JSON request and response bodies. `Content-Type: application/json` for POST bodies.

**CORS:** Enabled for browser clients.

**OpenAPI:** See [`openapi.yaml`](openapi.yaml) for machine-readable schemas.

---

## Authentication

| Access | Routes | Header |
|--------|--------|--------|
| Public | Discovery, status, prefix check, reserve, release (email), my-reservations, reports, duplicates, open | None |
| Admin | `GET /api/reservations`, `GET /api/used`, `DELETE /api/release/<prefix>` | `X-API-Key: <api_key>` when `[api] api_key` is set in `config.ini` |

When `api_key` is blank, admin routes are also open (development only; set a key in production).

Public **reserve** and **release** never require an API key, matching the public website form.

---

## Errors

Failed requests return JSON:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid input |
| 401 | Wrong or missing API key; email mismatch on release |
| 404 | Resource not found |
| 409 | Prefix already reserved |

---

## Endpoints

### GET /api

API discovery: public route list, `prefix_length`, documentation path.

**Response 200**

```json
{
  "name": "Gulf Coast Mesh Monitor API",
  "documentation": "docs/API.md",
  "prefix_length": 4,
  "authentication": { "public": "...", "admin": "..." },
  "public_routes": [ { "method": "GET", "path": "/api/status", "description": "..." } ],
  "admin_routes": [ { "method": "GET", "path": "/api/reservations" } ]
}
```

**Example**

```bash
curl -s https://meshbuddy.gulfcoastmesh.org/api
```

---

### GET /api/status

Service health and configuration useful for API clients.

**Response 200**

```json
{
  "status": "ok",
  "timestamp": "2026-05-27T12:00:00",
  "prefix_length": 4,
  "mesh_map_url": "https://explorer.louisianamesh.org",
  "website_url": "https://meshbuddy.gulfcoastmesh.org",
  "reports": { "active_days": 14 }
}
```

**Example**

```bash
curl -s https://meshbuddy.gulfcoastmesh.org/api/status
```

---

### GET /api/prefix/{prefix}

Check whether a hex prefix can be reserved before calling `POST /api/reserve`.

**Path**

- `prefix` — 4 hex characters (e.g. `A1B2`). Uppercase in responses.

**Response 200**

```json
{
  "prefix": "A1B2",
  "available": true,
  "reason": "available",
  "message": "prefix is available to reserve"
}
```

**`reason` values**

| reason | `available` | Meaning |
|--------|-------------|---------|
| `available` | true | Can be reserved |
| `reserved` | false | In `reservedNodes.json` |
| `deployed` | false | Repeater with this prefix is active (`offReserved.json`) |
| `unusable` | false | `0000` or `FFFF` (convention) |
| `invalid` | false | Wrong length, non-hex, or 2-char (1-byte) prefix when 4-char required |

**Example**

```bash
curl -s https://meshbuddy.gulfcoastmesh.org/api/prefix/ABCD
curl -s https://meshbuddy.gulfcoastmesh.org/api/prefix/0000
```

---

### POST /api/reserve

Reserve a repeater prefix (same data as the website reservation form).

**Body (required)**

| Field | Type | Description |
|-------|------|-------------|
| `prefix` | string | 4 hex characters |
| `name` | string | Repeater name |
| `lat` | number | Latitude -90..90 |
| `lon` | number | Longitude -180..180 |
| `altitude` | number | Altitude (feet) |
| `email` | string | Contact email |

**Body (optional)**

| Field | Type | Default |
|-------|------|---------|
| `username` | string | `api-user` |
| `display_name` | string | `username` |
| `user_id` | number | `0` |
| `source` | string | `api` |

**Response 201**

```json
{
  "message": "Prefix A1B2 reserved successfully",
  "reservation": {
    "prefix": "A1B2",
    "name": "My Repeater",
    "lat": 30.45,
    "lon": -91.19,
    "altitude": 25.0,
    "email": "you@example.com",
    "username": "api-user",
    "display_name": "api-user",
    "user_id": 0,
    "added_at": "2026-05-27T12:00:00",
    "source": "api"
  }
}
```

**Example**

```bash
curl -s -X POST https://meshbuddy.gulfcoastmesh.org/api/reserve \
  -H 'Content-Type: application/json' \
  -d '{
    "prefix": "A1B2",
    "name": "Test Repeater",
    "lat": 30.4515,
    "lon": -91.1871,
    "altitude": 50,
    "email": "you@example.com"
  }'
```

---

### POST /api/release

Release a reservation. The email must match the one stored at reserve time.

**Body (required)**

| Field | Type |
|-------|------|
| `prefix` | string |
| `email` | string |

**Response 200**

```json
{
  "message": "Prefix A1B2 released",
  "prefix": "A1B2"
}
```

**Example**

```bash
curl -s -X POST https://meshbuddy.gulfcoastmesh.org/api/release \
  -H 'Content-Type: application/json' \
  -d '{"prefix": "A1B2", "email": "you@example.com"}'
```

---

### POST /api/my-reservations

List all prefix reservations tied to a contact email. Searches both active reservations (`reservedNodes.json`) and deployed reservations (`offReserved.json`). Returns an empty list when no matches are found (does not reveal whether the email exists elsewhere).

**Body (required)**

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Contact email used at reserve time |

**Response 200**

```json
{
  "timestamp": "2026-06-16T12:00:00",
  "email": "you@example.com",
  "count": 2,
  "reservations": [
    {
      "prefix": "A1B2",
      "name": "My Repeater",
      "lat": 30.45,
      "lon": -91.19,
      "altitude": 25.0,
      "email": "you@example.com",
      "username": "api-user",
      "display_name": "api-user",
      "user_id": 0,
      "added_at": "2026-05-27T12:00:00",
      "source": "api",
      "status": "reserved"
    },
    {
      "prefix": "CAFE",
      "name": "Deployed Node",
      "lat": 30.12,
      "lon": -91.05,
      "altitude": 40.0,
      "email": "you@example.com",
      "username": "api-user",
      "display_name": "api-user",
      "user_id": 0,
      "added_at": "2026-04-10T08:30:00",
      "source": "api",
      "status": "deployed"
    }
  ]
}
```

**`status` values**

| status | Meaning |
|--------|---------|
| `reserved` | Active reservation (not yet deployed on the mesh) |
| `deployed` | Reservation moved to off-reserved after a live repeater matched |

Results are sorted by `prefix` ascending.

**Example**

```bash
curl -s -X POST https://meshbuddy.gulfcoastmesh.org/api/my-reservations \
  -H 'Content-Type: application/json' \
  -d '{"email": "you@example.com"}'
```

---

### GET /api/reports

Network health report (powers the `/reports` page). Includes summary stats, repeaters without location, and clock sync (minor drift and out-of-sync only in the repeater table).

**Performance:** First request after cache expiry may take several seconds while clock skew is fetched from the [Gulf Coast Mesh Analyzer](https://analyzer.gulfcoastmesh.org/). Subsequent requests within the CoreScope cache TTL (~5 minutes) are faster.

**Response 200** (top-level keys)

| Key | Description |
|-----|-------------|
| `timestamp` | Report generation time |
| `config` | `active_days`, `prefix_length` |
| `summary` | `total_nodes`, `repeaters`, `companions`, `needs_attention`, `recently_active` |
| `no_location` | `{ count, repeaters[] }` — active repeaters missing GPS |
| `clock_sync` | Clock buckets and issue rows |

**`clock_sync`**

```json
{
  "source": "corescope",
  "fetched": 225,
  "missing": 25,
  "ok": 110,
  "minor": 12,
  "out_of_sync": 82,
  "unknown": 25,
  "repeaters": [
    {
      "name": "Example",
      "prefix": "ABCD",
      "public_key": "ABCD...",
      "last_seen": "2026-05-27T10:00:00+00:00",
      "clock_skew_seconds": 120,
      "clock_sync": "minor",
      "clock_sync_label": "Minor Drift",
      "location": { "text": "30.45, -91.19", "map_url": "..." },
      "owner": null,
      "advert_count": 42,
      "region": "MSY"
    }
  ]
}
```

`clock_sync.repeaters` only includes **minor** and **out_of_sync** repeaters (not clock-OK nodes).

**Example**

```bash
curl -s https://meshbuddy.gulfcoastmesh.org/api/reports
```

---

### GET /api/duplicates

Repeater prefixes used by more than one distinct repeater name (powers `/duplicates`).

**Response 200**

```json
{
  "timestamp": "2026-05-27T12:00:00",
  "count": 3,
  "duplicates": [
    {
      "prefix": "ABCD",
      "count": 2,
      "nodes": [
        { "name": "Repeater A", "public_key": "ABCD...", "last_seen": "..." },
        { "name": "Repeater B", "public_key": "ABCD...", "last_seen": "..." }
      ]
    }
  ]
}
```

**Example**

```bash
curl -s https://meshbuddy.gulfcoastmesh.org/api/duplicates
```

---

## Appendix: GET /api/open

Not used by the public website; helpful for bots and integrators. Returns a **sample** of open prefixes and total count (not the full list when the space is large).

**Response 200**

```json
{
  "timestamp": "2026-05-27T12:00:00",
  "count": 65000,
  "open": ["0001", "0002", "..."]
}
```

**Example**

```bash
curl -s https://meshbuddy.gulfcoastmesh.org/api/open
```

---

## Admin routes (not public website)

Require `X-API-Key` when `api_key` is set in `config.ini`.

### GET /api/reservations

All rows from `reservedNodes.json` (includes email addresses).

### GET /api/used

Deployed / off-reserved entries from `offReserved.json`.

### DELETE /api/release/{prefix}

Force-release without email verification (website admin dashboard).

```bash
curl -s -X DELETE https://meshbuddy.gulfcoastmesh.org/api/release/A1B2 \
  -H 'X-API-Key: YOUR_SECRET'
```

---

## Website mapping

| Website page | API |
|--------------|-----|
| [Reserve](https://meshbuddy.gulfcoastmesh.org/) | `POST /api/reserve`, `GET /api/prefix/{prefix}` |
| [My prefixes](https://gulfcoastmesh.org/mesh-monitor#lookup) | `POST /api/my-reservations` |
| [Reports](https://meshbuddy.gulfcoastmesh.org/reports) | `GET /api/reports` |
| [Duplicates](https://meshbuddy.gulfcoastmesh.org/duplicates) | `GET /api/duplicates` |

The website at [meshbuddy.gulfcoastmesh.org](https://meshbuddy.gulfcoastmesh.org/) proxies admin calls with a server-side API key; public pages use the endpoints above without a key.
