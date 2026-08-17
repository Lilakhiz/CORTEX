from entity_filter import filter_graph_entities_and_edges


def build_graph(entities, relationships):

    nodes = {}
    edges = []

    edge_set = set()
    for document in entities or []:

        for entity in document.get("entities", []):

            entity_id = entity.get("id")
            if not entity_id:
                continue

            evidence_id = document.get("evidence_id")
            source = document.get("source")

            if entity_id not in nodes:
                nodes[entity_id] = {
                    "id": entity_id,
                    "name": entity.get("name", entity_id),
                    "type": entity.get("type", "Entity"),
                    "evidence_ids": [],
                    "sources": []
                }

            # Add evidence_id if not already present
            if evidence_id and evidence_id not in nodes[entity_id]["evidence_ids"]:
                nodes[entity_id]["evidence_ids"].append(evidence_id)

            # Add source if not already present
            if source and source not in nodes[entity_id]["sources"]:
                nodes[entity_id]["sources"].append(source)

    for document in relationships or []:

        for relationship in document.get("relationships", []):
            source = relationship.get("source")
            target = relationship.get("target")
            relation = relationship.get("relation")

            if not source or not target or not relation:
                continue

            if source not in nodes:
                nodes[source] = {
                    "id": source,
                    "name": source,
                    "type": "Entity",
                    "evidence_ids": [],
                    "sources": []
                }

            if target not in nodes:
                nodes[target] = {
                    "id": target,
                    "name": target,
                    "type": "Entity",
                    "evidence_ids": [],
                    "sources": []
                }

            key = (source, relation, target)

            if key in edge_set:
                continue

            edge_set.add(key)
            edges.append({
                "source": source,
                "relation": relation,
                "target": target,
            })

    # Build initial graph
    initial_graph = {
        "nodes": list(nodes.values()),
        "edges": edges,
    }

    # Filter out junk entities and dangling edges, but preserve structured IDs
    filtered_nodes, filtered_edges = filter_graph_entities_and_edges(
        initial_graph["nodes"],
        initial_graph["edges"]
    )

    # If the filter removed everything, fall back to the raw graph so the component
    # still renders nodes/edges for valid extracted entities.
    if not filtered_nodes and initial_graph["nodes"]:
        filtered_nodes = initial_graph["nodes"]

    if not filtered_edges and initial_graph["edges"]:
        filtered_edges = initial_graph["edges"]

    return {
        "nodes": filtered_nodes,
        "edges": filtered_edges,
    }