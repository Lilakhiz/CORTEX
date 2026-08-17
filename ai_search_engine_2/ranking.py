SOURCE_SCORES = {
    "government": 1.00,
    "wikipedia": 0.95,
    "news": 0.90,
    "github": 0.85,
    "google": 0.80,
    "bing": 0.80,
    "youtube": 0.70,
    "reddit": 0.60,
}


def rank_evidence(evidence, query):

    query_words = set(query.lower().split())

    for document in evidence:

        score = SOURCE_SCORES.get(
            document["source"],
            0.50,
        )

        text = (
            document["title"] +
            " " +
            document["content"]
        ).lower()

        doc_words = set(text.split())

        score += len(query_words & doc_words) * 0.05

        length = len(document["content"])

        if length > 3000:
            score += 0.10
        elif length > 1500:
            score += 0.08
        elif length > 700:
            score += 0.05

        document["score"] = round(score, 3)

    evidence.sort(
        key=lambda x: x["score"],
        reverse=True,
    )

    return evidence