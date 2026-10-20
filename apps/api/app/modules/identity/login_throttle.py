"""In-memory brute-force throttle (FR-AUTH-01): 5 consecutive failures per
account -> temporary 15-minute lock. Single API instance v1 (TD-05)."""

import time
from dataclasses import dataclass, field

MAX_ATTEMPTS = 5
LOCK_SECONDS = 15 * 60


@dataclass
class _Entry:
    fails: int = 0
    locked_until: float = 0.0


@dataclass
class LoginThrottle:
    _entries: dict[str, _Entry] = field(default_factory=dict)

    def check(self, email: str) -> float:
        """Return remaining lock seconds (>0 means locked)."""
        entry = self._entries.get(email.lower())
        if not entry:
            return 0.0
        remaining = entry.locked_until - time.monotonic()
        return max(0.0, remaining)

    def record_failure(self, email: str) -> int:
        key = email.lower()
        entry = self._entries.setdefault(key, _Entry())
        entry.fails += 1
        if entry.fails >= MAX_ATTEMPTS:
            entry.locked_until = time.monotonic() + LOCK_SECONDS
            entry.fails = 0
        return entry.fails

    def reset(self, email: str) -> None:
        self._entries.pop(email.lower(), None)


# module-level singleton used by the auth service
login_throttle = LoginThrottle()
