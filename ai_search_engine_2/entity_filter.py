import re
from urllib.parse import urlparse
from typing import Dict, Any, List, Set

# Generic/web artifact terms that should not be entities
GENERIC_WEB_TERMS = {
    "home", "about", "contact", "login", "signup", "register", "search", "news",
    "latest", "recent", "popular", "trending", "featured", "editorial", "article",
    "read more", "click here", "learn more", "view more", "show more", "load more",
    "source", "reference", "citation", "link", "url", "website", "site", "page",
    "blog", "post", "entry", "update", "news", "story", "report", "coverage",
    "analysis", "review", "preview", "guide", "tutorial", "how to", "tips",
    "best", "top", "list", "ranking", "comparison", "vs", "versus", "alternative",
    "download", "install", "setup", "get started", "documentation", "docs", "api",
    "privacy", "terms", "policy", "cookie", "advertise", "subscribe", "newsletter",
    "follow", "share", "twitter", "facebook", "linkedin", "instagram", "youtube",
    "rss", "feed", "sitemap", "archive", "category", "tag", "author", "profile",
    "dashboard", "settings", "account", "preferences", "help", "support", "faq",
    "community", "forum", "discussion", "comment", "reply", "like", "vote",
    "welcome", "thank you", "thanks", "hello", "hi", "dear", "sincerely", "regards"
}

# Known source domains that should not become entities
SOURCE_DOMAINS = {
    "techcrunch.com", "theverge.com", "wired.com", "arstechnica.com", "engadget.com",
    "venturebeat.com", "zdnet.com", "cnet.com", "gizmodo.com", "mashable.com",
    "recode.net", "businessinsider.com", "forbes.com", "bloomberg.com", "reuters.com",
    "wsj.com", "nytimes.com", "washingtonpost.com", "theguardian.com", "bbc.com",
    "cnn.com", "abcnews.go.com", "nbcnews.com", "cbsnews.com", "foxnews.com",
    "medium.com", "substack.com", "hackernews", "news.ycombinator.com", "reddit.com",
    "github.com", "gitlab.com", "stackoverflow.com", "stackexchange.com",
    "wikipedia.org", "wikimedia.org", "arxiv.org", "pubmed.ncbi.nlm.nih.gov",
    "scholar.google.com", "researchgate.net", "academia.edu", "semanticscholar.org",
    "huggingface.co", "paperswithcode.com", "openai.com", "anthropic.com",
    "deepmind.com", "google.com", "microsoft.com", "amazon.com", "meta.com",
    "nvidia.com", "amd.com", "intel.com", "ibm.com", "apple.com"
}

# Common URL patterns and TLDs
URL_PATTERNS = [
    r'^https?://',
    r'^www\.',
    r'\.(com|org|net|io|co|ai|dev|app|blog|news|tech|science|edu|gov|mil)(/|$)',
]

# Maximum reasonable entity name length
MAX_ENTITY_LENGTH = 100

# Minimum meaningful entity length
MIN_ENTITY_LENGTH = 2


def is_url(text: str) -> bool:
    """Check if text is a URL."""
    text = text.strip()
    if not text:
        return True
    # Check for URL patterns
    for pattern in URL_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    # Try parsing as URL
    try:
        result = urlparse(text if '://' in text else 'http://' + text)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def is_domain(text: str) -> bool:
    """Check if text is a domain name."""
    text = text.strip().lower()
    if not text:
        return True
    # Check if it's a known source domain
    if text in SOURCE_DOMAINS:
        return True
    # Check if it looks like a domain
    domain_pattern = r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    if re.match(domain_pattern, text):
        # Check if it has a known TLD
        parts = text.split('.')
        if len(parts) >= 2 and parts[-1] in {'com', 'org', 'net', 'io', 'co', 'ai', 'dev', 'app', 'blog', 'news', 'tech', 'science', 'edu', 'gov', 'mil', 'uk', 'us', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'in', 'br', 'ru'}:
            return True
    return False


def is_email(text: str) -> bool:
    """Check if text is an email address."""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, text.strip()))


def is_generic_web_term(text: str) -> bool:
    """Check if text is a generic web/UI term."""
    normalized = text.strip().lower()
    return normalized in GENERIC_WEB_TERMS


def is_excessively_long(text: str) -> bool:
    """Check if text is too long to be an entity name."""
    return len(text.strip()) > MAX_ENTITY_LENGTH


def is_too_short(text: str) -> bool:
    """Check if text is too short to be meaningful."""
    return len(text.strip()) < MIN_ENTITY_LENGTH


def is_sentence_or_paragraph(text: str) -> bool:
    """Check if text looks like a sentence or paragraph rather than an entity."""
    text = text.strip()
    if not text:
        return True
    # Multiple sentences
    if text.count('.') > 1:
        return True
    # Ends with period and is long
    if text.endswith('.') and len(text) > 50:
        return True
    # Contains common sentence starters
    sentence_starters = ['the ', 'this ', 'that ', 'these ', 'those ', 'it ', 'he ', 'she ', 'they ', 'we ', 'i ', 'a ', 'an ']
    lower_text = text.lower()
    if any(lower_text.startswith(s) for s in sentence_starters) and len(text) > 30:
        return True
    return False


def is_meaningless_string(text: str) -> bool:
    """Check if text is meaningless (only numbers, symbols, etc.)."""
    text = text.strip()
    if not text:
        return True
    # Only numbers and punctuation
    if re.match(r'^[\d\s\W]+$', text):
        return True
    # Only repeated characters
    if len(set(text.replace(' ', '').lower())) <= 2:
        return True
    return False


def is_source_artifact(text: str, known_sources: Set[str] = None) -> bool:
    """Check if text appears to be a source hostname or publication name."""
    text_lower = text.strip().lower()
    if not text_lower:
        return True
    
    # Check against known source domains - exact match or domain match
    if known_sources:
        for source in known_sources:
            source_lower = source.lower()
            # Only reject if the entity name IS the source (exact match)
            # or if the entity name is a domain that matches a known source domain
            if text_lower == source_lower:
                # Allow if it's a well-known company name that happens to match
                # but reject if it looks like a domain
                if is_domain(source) or source_lower.endswith(('.com', '.org', '.net', '.io', '.co', '.ai')):
                    return True
            # Also reject if entity is a domain that matches a known source
            if is_domain(text_lower) and text_lower == source_lower:
                return True
    
    # Check for common publication suffixes
    publication_suffixes = [' news', ' times', ' post', ' herald', ' tribune', ' gazette', 
                           ' journal', ' chronicle', ' dispatch', ' courier', ' observer',
                           ' review', ' magazine', ' weekly', ' daily', ' monthly',
                           ' today', ' report', ' insider', ' outlook', ' monitor']
    for suffix in publication_suffixes:
        if text_lower.endswith(suffix) and len(text_lower) > len(suffix) + 2:
            return True
    
    return False


def validate_entity(entity: Dict[str, Any], known_sources: Set[str] = None) -> bool:
    """
    Validate if an extracted entity should be kept in the knowledge graph.

    Returns True if entity is valid, False if it should be filtered out.
    """
    name = entity.get("name", "").strip()
    entity_id = entity.get("id", "").strip()
    entity_type = entity.get("type", "").strip()

    # Empty or missing name
    if not name:
        return False

    # Preserve entities that have structured IDs like company:openai or model:gpt-5.
    # These are common in this project and should not be treated as URLs.
    if entity_id and ":" in entity_id:
        entity_id = entity_id

    # Check various rejection criteria, but be conservative for normal entity names.
    if is_url(name) and not entity_id.startswith(("company:", "model:", "person:", "organization:", "technology:", "repository:", "dataset:", "concept:")):
        return False

    if is_domain(name) and not entity_id.startswith(("company:", "model:", "person:", "organization:", "technology:", "repository:", "dataset:", "concept:")):
        return False

    if is_email(name):
        return False

    if is_generic_web_term(name):
        return False

    if is_excessively_long(name):
        return False

    if is_too_short(name):
        return False

    if is_sentence_or_paragraph(name):
        return False

    if is_meaningless_string(name):
        return False

    if is_source_artifact(name, known_sources):
        return False

    # Check entity_id as well, but avoid rejecting structured, non-URL IDs.
    if entity_id and not entity_id.startswith(("company:", "model:", "person:", "organization:", "technology:", "repository:", "dataset:", "concept:", "government:", "country:", "city:", "framework:", "programming_language:", "paper:", "law:", "website:", "event:")):
        if is_url(entity_id) or is_domain(entity_id) or is_email(entity_id):
            return False

    return True


def filter_entities(entities: List[Dict[str, Any]], known_sources: Set[str] = None) -> List[Dict[str, Any]]:
    """
    Filter a list of entities, keeping only valid ones.
    """
    return [e for e in entities if validate_entity(e, known_sources)]


def extract_known_sources(entities: List[Dict[str, Any]]) -> Set[str]:
    """Extract known source names from entity sources field."""
    sources = set()
    for entity in entities:
        entity_sources = entity.get("sources", [])
        for source in entity_sources:
            if source:
                sources.add(source.lower())
    return sources


def filter_graph_entities_and_edges(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> tuple:
    """
    Filter nodes and edges to remove junk entities and dangling edges.

    Returns: (filtered_nodes, filtered_edges)
    """
    # First pass: collect all source names from nodes
    known_sources = set()
    for node in nodes:
        for source in node.get("sources", []):
            if source:
                known_sources.add(source.lower())

    # Validate each node
    valid_nodes = []
    valid_node_ids = set()

    for node in nodes:
        # Convert node to entity format for validation
        entity = {
            "name": node.get("name", node.get("id", "")),
            "id": node.get("id", ""),
            "type": node.get("type", "Entity"),
            "sources": node.get("sources", [])
        }

        if validate_entity(entity, known_sources):
            valid_nodes.append(node)
            valid_node_ids.add(node["id"])

    # Filter edges: keep edges whenever the source/target IDs are present in the
    # current graph node set, even if one endpoint wasn't individually validated.
    valid_edges = []
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if not source or not target:
            continue
        if source in valid_node_ids or source in {node.get("id") for node in nodes}:
            if target in valid_node_ids or target in {node.get("id") for node in nodes}:
                valid_edges.append(edge)

    return valid_nodes, valid_edges