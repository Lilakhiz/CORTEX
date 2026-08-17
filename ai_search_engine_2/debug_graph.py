from graph_builder import build_graph

entities = [
    {
        "evidence_id": "1",
        "source": "example.com",
        "entities": [{"id": "company:openai", "name": "OpenAI", "type": "Company"}],
    }
]
relationships = [
    {
        "evidence_id": "1",
        "relationships": [
            {"source": "company:openai", "relation": "developed", "target": "model:gpt-5"}
        ],
    }
]

print(build_graph(entities, relationships))
