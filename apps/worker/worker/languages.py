"""Per-language sandbox configuration — single source of truth.

Matches docs/system-architecture.md §6. Adding a language = adding an entry
here plus pulling its image; no core code changes (P3 runner consumes this).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class LanguageConfig:
    """Sandbox recipe for one submission language."""

    key: str                 # canonical language key used in messages/DB
    image: str               # pinned Docker image for compile + run
    compile_cmd: list[str]   # empty list = interpreted language, no compile step
    run_cmd: list[str]       # command executed inside one-shot sandbox container
    wall_timeout_s: int      # max wall-clock seconds per test run
    memory_mb: int           # container memory limit


LANGUAGES: dict[str, LanguageConfig] = {
    "python": LanguageConfig(
        key="python",
        image="python:3.12-slim",
        compile_cmd=[],
        run_cmd=["python", "main.py"],
        wall_timeout_s=5,
        memory_mb=256,
    ),
    "c": LanguageConfig(
        key="c",
        image="gcc:13",
        compile_cmd=["gcc", "-O2", "-o", "main", "main.c"],
        run_cmd=["./main"],
        wall_timeout_s=5,
        memory_mb=256,
    ),
    "cpp": LanguageConfig(
        key="cpp",
        image="gcc:13",
        compile_cmd=["g++", "-O2", "-o", "main", "main.cpp"],
        run_cmd=["./main"],
        wall_timeout_s=5,
        memory_mb=256,
    ),
    "java": LanguageConfig(
        key="java",
        image="eclipse-temurin:21-jdk-alpine",
        compile_cmd=["javac", "Main.java"],
        run_cmd=["java", "-Xss64m", "Main"],
        wall_timeout_s=10,
        memory_mb=512,
    ),
}


def get_language(key: str) -> LanguageConfig | None:
    """Return sandbox config for a language key, or None if unsupported."""
    return LANGUAGES.get(key)
