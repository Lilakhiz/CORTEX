import json
import os

MEMORY_FILE = "graph_memory.json"


def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return {"nodes": [], "edges": []}

    with open(MEMORY_FILE, "r") as f:
        return json.load(f)


def save_memory(graph):
    with open(MEMORY_FILE, "w") as f:
        json.dump(graph, f, indent=2)



def merge_graphs(old_graph, new_graph):

    nodes = {node["id"]: node for node in old_graph["nodes"]}

    for node in new_graph["nodes"]:
        nodes[node["id"]] = node

    edges = {
        (e["source"], e["relation"], e["target"]): e
        for e in old_graph["edges"]
    }

    for edge in new_graph["edges"]:
        edges[(edge["source"], edge["relation"], edge["target"])] = edge

    return {
        "nodes": list(nodes.values()),
        "edges": list(edges.values())
    }

