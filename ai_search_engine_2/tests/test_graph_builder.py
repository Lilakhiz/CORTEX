import unittest

from entity_filter import validate_entity
from graph_builder import build_graph


class GraphBuilderTests(unittest.TestCase):
    def test_validate_entity_accepts_company_names_with_colon_ids(self):
        entity = {
            "name": "OpenAI",
            "id": "company:openai",
            "type": "Company",
            "sources": ["example.com"],
        }

        self.assertTrue(validate_entity(entity, {"example.com"}))

    def test_build_graph_preserves_nodes_and_edges(self):
        entities = [
            {
                "evidence_id": "doc-1",
                "source": "example.com",
                "entities": [
                    {"id": "company:openai", "name": "OpenAI", "type": "Company"}
                ],
            }
        ]
        relationships = [
            {
                "evidence_id": "doc-1",
                "relationships": [
                    {
                        "source": "company:openai",
                        "relation": "developed",
                        "target": "model:gpt-5",
                    }
                ],
            }
        ]

        graph = build_graph(entities, relationships)

        self.assertGreaterEqual(len(graph["nodes"]), 1)
        self.assertEqual(len(graph["edges"]), 1)


if __name__ == "__main__":
    unittest.main()
