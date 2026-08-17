import json

from prompts import get_relationship_extraction_messages


def extract_relationships_from_document(
    document,
    entities,
    llm,
):

    document_text = f"""
TITLE:
{document.get("title", "")}

CONTENT:
{document.get("content", "")}
"""

    messages = get_relationship_extraction_messages(
        document_text,
        entities,
    )

    response = llm.invoke(messages)

    try:
        relationships = json.loads(response.content)
    except Exception:
        relationships = []

    return {
        "evidence_id": document["id"],
        "relationships": relationships,
    }


def extract_relationships(
    extracted_entities,
    evidence,
    llm,
):

    evidence_lookup = {
        item["id"]: item
        for item in evidence
    }

    results = []

    for entity_doc in extracted_entities:

        document = evidence_lookup.get(
            entity_doc["evidence_id"]
        )

        if document is None:
            continue

        results.append(
            extract_relationships_from_document(
                document,
                entity_doc["entities"],
                llm,
            )
        )

    return results