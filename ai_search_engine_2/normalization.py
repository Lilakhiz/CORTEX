import re
from urllib.parse import urlparse

def clean_text(text):

    if not text:
        return ""

    text = re.sub(r"\s+", " ", text)

    return text.strip()


def clean_title(title):

    title = clean_text(title)

    return title.title()


def clean_url(url):

    if not url:
        return ""

    parsed = urlparse(url)

    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"


def normalize_item(item):

    content = clean_text(
        item.get("content")
        or item.get("description")
        or item.get("summary")
        or ""
    )

    if len(content) > 4000:
        content = content[:4000]

    return {

        "id": item["id"],

        "source": item["source"],

        "title": clean_title(item.get("title")),

        "content": content,

        "url": clean_url(item.get("url")),

        "timestamp": item.get("timestamp"),

        "author": item.get("author"),

        "score": item.get("score"),

        "metadata": item.get("metadata", {})
    }


def remove_duplicates(evidence):

    seen = set()

    cleaned = []

    for item in evidence:

        url = item["url"]

        if url in seen:
            continue

        seen.add(url)

        cleaned.append(item)

    return cleaned


def normalize_evidence(evidence):

    normalized = []

    for item in evidence:

        if not item:
            continue

        normalized_item = normalize_item(item)

        # Keep items that have either content or a title
        if (
            normalized_item["content"] == ""
            and normalized_item["title"] == ""
        ):
            continue

        normalized.append(normalized_item)


    return normalized

