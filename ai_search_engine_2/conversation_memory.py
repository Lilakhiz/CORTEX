"""
Lightweight short-term conversation memory for Cortex.

- Pure in-process list, no embeddings / vector DB / extra LLM calls.
- Keeps only the last MAX_TURNS (user + assistant) exchanges.
- Uses simple keyword/pronoun heuristics to decide whether a new query
  depends on prior context, so unrelated history is never injected.
"""

import re
from collections import deque

MAX_TURNS = 5          # how many past user+assistant turns to retain
CONTEXT_TURNS = 2       # how many of those turns to actually inject when relevant

# Words/phrases that typically signal the query refers back to prior context.
_REFERENCE_PATTERNS = [
    r"\bit\b", r"\bits\b", r"\bthey\b", r"\bthem\b", r"\btheir\b",
    r"\bthat\b", r"\bthis\b", r"\bthese\b", r"\bthose\b",
    r"\bcompare\b", r"\bcontinue\b", r"\bexplain more\b", r"\bmore about\b",
    r"\bwhat about\b", r"\bwhy\b", r"\bthe former\b", r"\bthe latter\b",
    r"\balso\b", r"\bsimilarly\b", r"\belaborate\b", r"\bfurther\b",
]
_REFERENCE_RE = re.compile("|".join(_REFERENCE_PATTERNS), re.IGNORECASE)

# deque of completed turns: [{"user": "...", "assistant": "..."}, ...]
_history: deque = deque(maxlen=MAX_TURNS)

# holds a user message until its matching assistant reply arrives
_pending_user = None


def add_message(role: str, content: str) -> None:
    """Record a message. A turn is committed once both user + assistant exist."""
    global _pending_user

    if role == "user":
        _pending_user = content
    elif role == "assistant":
        if _pending_user is not None:
            _history.append({"user": _pending_user, "assistant": content})
            _pending_user = None
        # else: stray assistant message with no preceding user turn - ignore


def _is_referential(query: str) -> bool:
    return bool(_REFERENCE_RE.search(query))


def get_relevant_context(query: str) -> str:
    """
    Returns a compact string of recent turns if `query` looks like it depends
    on prior conversation, otherwise returns "" (treat query as standalone).
    Only the last CONTEXT_TURNS turns are ever included, to keep tokens low.
    """
    if not _history or not _is_referential(query):
        return ""

    recent = list(_history)[-CONTEXT_TURNS:]

    lines = []
    for turn in recent:
        lines.append(f"User: {turn['user']}")
        lines.append(f"Assistant: {turn['assistant']}")

    return "\n".join(lines)


def clear_history() -> None:
    global _pending_user
    _history.clear()
    _pending_user = None
