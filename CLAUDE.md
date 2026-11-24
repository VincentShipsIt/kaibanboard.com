# Kaiban Board

Claude-specific entry point. Documentation in `.agent/`.

## Commands

Check `.agent/SYSTEM/RULES.md` for coding standards.

## Sessions

Document all work in `.agent/SESSIONS/YYYY-MM-DD.md` (one file per day).

## Testing Policy
- Write tests FIRST before implementation (TDD)
- All new features must include tests before code
- Aim for 80%+ coverage on new code
- Run tests before committing

## Claude model routing

- Standard implementation: Claude Sonnet 5.5.
- Big implementation (large or cross-cutting changes) and planning: Claude Opus 5.5 or newer.
- Audits, major or minor: the latest Claude Fable (5.2 today). Fable never implements or edits code.
