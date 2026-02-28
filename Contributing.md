# Contributing

TOP REP is a quota probability engine.

------------------------------------------------------------------------

## Core Rule

Event → Stats → Forecast → UI

------------------------------------------------------------------------

## Pull Requests Must Include

-   Which layer is affected?
-   Why does this improve quota prediction?
-   Are forecast tests updated?

------------------------------------------------------------------------

## Never

-   Compute analytics in UI
-   Bypass event logging
-   Mutate stats directly
-   Add DB queries in forecast logic
