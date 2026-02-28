# Architectural Decisions

## 2026-02-27 --- Event-first architecture

Chose append-only event logging to: - ensure auditability - allow stat
rebuild - enable deterministic forecasting

------------------------------------------------------------------------

## 2026-02-27 --- Forecast caching

Cache `rep_month_forecast` to: - ensure realtime UI performance - avoid
heavy recalculation
