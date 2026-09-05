# Statistics browser fixtures

The current landing integration spec builds synthetic native contract responses
from `src/features/statistics/test/native-landing-fixtures.ts`. It exercises
national tiles, an independently paged 42-county universe, complete source vectors,
publication provenance, shared example selection, failures and recovery. EN/RO
and mobile/desktop cases validate UI behavior; they do not prove live source
values, population authority, geography or migration parity.

The JSON payloads in this directory retain earlier fixture shapes for reference
and shared fixture loading. The current landing spec does not read them. Legacy
landing decade/example payloads are not native-source validation evidence.
