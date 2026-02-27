# Architecture

## Golden Pipeline

Event → Stats → Forecast → UI

------------------------------------------------------------------------

## Layers

### 1. Events (Source of Truth)

-   Append-only
-   Immutable
-   Validated
-   Rebuildable

Table: `events`

------------------------------------------------------------------------

### 2. Stats (Derived State)

-   Incrementally updated
-   One row per rep per month
-   Rebuildable from events

Table: `rep_month_stats`

------------------------------------------------------------------------

### 3. Forecast (Pure Logic)

Located in:

/lib/domain/forecast

Rules: - No DB calls - Pure functions only - Deterministic - Testable

Cached in:

`rep_month_forecast`

------------------------------------------------------------------------

### 4. UI

-   Reads forecast only
-   Subscribes to forecast updates
-   No business logic
