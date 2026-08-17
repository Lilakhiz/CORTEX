import json
from prompts import get_entity_extraction_messages


def extract_entities_from_document(document, llm):

    document_text = f"""
                TITLE:
                {document.get("title", "")}

                CONTENT:
                {document.get("content", "")}
                """

    messages = get_entity_extraction_messages(document_text)

    response = llm.invoke(messages)

    try:
        entities = json.loads(response.content)
    except Exception:
        entities = []

    return {
        "evidence_id": document["id"],
        "source": document["source"],
        "entities": entities,
    }


def extract_entities(evidence, llm):

    results = []

    for document in evidence:

        results.append(
            extract_entities_from_document(
                document,
                llm,
            )
        )

    return results