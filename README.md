# TOP REP

> Real-Time Quota Probability Engine for Dealership Sales Teams

------------------------------------------------------------------------

## Version

**Current Version:** v0.2.0 (Forecast Architecture Refactor)

Versioning format: - v0.x.x → Architecture + internal milestone builds -
v1.0.0 → First production-ready dealership deployment - v2.0.0 →
Advanced probabilistic + ML forecasting

------------------------------------------------------------------------

## Product Identity

TOP REP is not a CRM. TOP REP is not a dashboard.

TOP REP is a **real-time quota probability engine**.

Core question:

> What is the probability this rep hits quota this month --- and what
> actions increase it?

Everything in this repository must serve that question.

------------------------------------------------------------------------

# Progress Tracker

## Phase 0 --- Foundation (Architecture)

-   [x] Next.js + Supabase setup
-   [x] Leaderboard + pipeline UI
-   [x] Analytics engine (initial)
-   [x] Domain layer refactor (`/lib/domain`)
-   [ ] Event-first pipeline fully implemented
-   [ ] rep_month_stats incremental updates
-   [ ] rep_month_forecast caching
-   [ ] Real-time forecast updates

------------------------------------------------------------------------

## Phase 1 --- Probability Engine

-   [ ] Binomial quota probability model
-   [ ] Smoothed rate estimators
-   [ ] Next-best-action contract
-   [ ] Forecast unit tests
-   [ ] Rebuild stats from events script

------------------------------------------------------------------------

## Phase 2 --- Product Hardening

-   [ ] Multi-tenant RLS enforcement
-   [ ] Environment separation (dev/staging/prod)
-   [ ] Full event validation (Zod)
-   [ ] Forecast performance optimization
-   [ ] Production logging

------------------------------------------------------------------------

## Phase 3 --- Advanced Modeling

-   [ ] Bayesian rate updating
-   [ ] Time-to-close modeling
-   [ ] Volatility scoring
-   [ ] Monte Carlo simulation
-   [ ] Lead distribution optimization

------------------------------------------------------------------------

# Architecture Overview

Golden pipeline:

Event → Stats → Forecast → UI

See `ARCHITECTURE.md` for details.

------------------------------------------------------------------------

# Non-Negotiables

-   No business logic in React components
-   No DB calls in domain forecast logic
-   Events are append-only
-   Derived state is rebuildable
-   Forecast math must be testable
-   All features must map to quota probability
