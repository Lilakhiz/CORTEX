import os
import re
import sys

# Windows consoles default stdout/stderr to a legacy codepage (e.g. cp1252)
# that can't encode arbitrary unicode (em dashes, non-breaking hyphens, etc.)
# coming back from LLM responses. The many print() calls throughout this
# pipeline would otherwise crash requests with UnicodeEncodeError -> 500.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from typing import Annotated, List, Type, TypeVar
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from web_operations import (serp_search,
                            reddit_search_api,
                            reddit_post_retrieval, 
                            github_search,
                            wikipedia_search,
                            news_search,
                            youtube_search,
                            government_search)
from prompts import (
    get_reddit_url_analysis_messages,
    get_synthesis_messages,
    get_intent_detection_messages,
)

from evidence import collect_evidence
from normalization import normalize_evidence
from entity_extraction import extract_entities
from relationship_extraction import extract_relationships
from graph_builder import build_graph
import json
from ranking import rank_evidence
from memory import (
    load_memory,
    save_memory,
    merge_graphs,
)
from conversation_memory import (
    add_message as add_conversation_message,
    get_relevant_context,
    clear_history as clear_conversation_history,
)

load_dotenv()

llm = ChatNVIDIA(model="nvidia/nemotron-3-super-120b-a12b", timeout=120)

SchemaT = TypeVar("SchemaT", bound=BaseModel)


def invoke_structured(llm, messages: list, schema: Type[SchemaT], max_retries: int = 2) -> SchemaT:
    """Get a Pydantic-validated response from the LLM via prompted JSON.

    ChatNVIDIA's `.with_structured_output()` relies on a `guided_json`
    request field that not every hosted NIM model/endpoint combination
    supports (nemotron-3-super-120b-a12b returns a 400 "unknown field
    guided_json" error). Prompting for JSON and parsing/validating it
    ourselves works with any chat model, so we do that instead, with a
    couple of self-correcting retries if the model returns malformed JSON.
    """
    schema_json = json.dumps(schema.model_json_schema(), indent=2)
    instruction = (
        "\n\nRespond with ONLY a single valid JSON object (no markdown "
        "fences, no commentary) that matches this JSON schema:\n" + schema_json
    )

    convo = list(messages)
    convo[-1] = {**convo[-1], "content": convo[-1]["content"] + instruction}

    last_error = None
    for _ in range(max_retries + 1):
        response = llm.invoke(convo)
        text = response.content.strip()
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
        try:
            data = json.loads(text)
            return schema.model_validate(data)
        except Exception as e:
            last_error = e
            convo = convo + [
                {"role": "assistant", "content": response.content},
                {
                    "role": "user",
                    "content": f"That was not valid JSON matching the schema ({e}). "
                    "Return ONLY the corrected JSON object.",
                },
            ]

    raise ValueError(f"Failed to get structured output after {max_retries + 1} attempts: {last_error}")


class SearchIntent(BaseModel):
    intent: str = Field(
        description="technical, news, financial, general"
    )

    entities: List[str] = Field(
        description="Important entities in the question."
    )

    sources: List[str] = Field(
        description="Sources to query. Possible values: google, bing, reddit, github, wikipedia, news, youtube."
    )

    reasoning: str = Field(
        description="Why these sources were selected."
    )


class State(TypedDict):
    messages: Annotated[list, add_messages]
    user_question: str | None
    google_results: str | None
    bing_results: str | None
    reddit_results: str | None
    selected_reddit_urls: list[str] | None
    reddit_post_data: list | None
    final_answer: str | None
    search_intent: SearchIntent | None
    github_results: list | None
    wikipedia_results: dict | None
    news_results: list | None
    youtube_results: list | None
    government_results: list | None
    evidence: list
    normalized_evidence: list
    entities: list
    relationships: list
    knowledge_graph: dict
    normalized_evidence: list
    ranked_evidence: list
    evidence_used: list
    conversation_context: str | None


class RedditURLAnalysis(BaseModel):
    selected_urls: List[str] = Field(description="List of Reddit URLs that contain valuable information for answering the user's question")


def detect_intent(state: State):

    print("Detecting intent...")

    question = state["user_question"]

    messages = get_intent_detection_messages(question)

    intent = invoke_structured(llm, messages, SearchIntent)

    print(intent)

    return {
        "search_intent": intent
    }


def google_search(state: State):
    intent = state["search_intent"]

    if "google" not in intent.sources:
        print("Skipping Google")
        return {}

    user_question = state["user_question"]

    print(f"Searching Google for: {user_question}")

    google_results = serp_search(user_question, engine="google")

    return {"google_results": google_results}


def bing_search(state: State):
    intent = state["search_intent"]

    if "bing" not in intent.sources:
        print("Skipping Bing")
        return {}

    user_question = state["user_question"]

    print(f"Searching Bing for: {user_question}")

    bing_results = serp_search(user_question, engine="bing")

    return {"bing_results": bing_results}


def reddit_search(state: State):
    intent = state["search_intent"]

    if "reddit" not in intent.sources:
        print("Skipping Reddit")
        return {}

    user_question = state["user_question"]
    
    print(f"Searching Reddit for: {user_question}")

    reddit_results = reddit_search_api(keyword=user_question)
    print(reddit_results)

    return {"reddit_results": reddit_results}


def github_search_node(state: State):

    intent = state["search_intent"]

    if "github" not in intent.sources:
        print("Skipping GitHub")
        return {}

    user_question = state["user_question"]

    print(f"Searching GitHub for: {user_question}")

    results = github_search(user_question)

    return {
        "github_results": results
    }


def wikipedia_search_node(state: State):

    intent = state["search_intent"]

    if "wikipedia" not in intent.sources:
        print("Skipping Wikipedia")
        return {}

    user_question = state["user_question"]

    query = intent.entities[0] if intent.entities else state["user_question"]

    print(f"Searching Wikipedia for: {user_question}")

    results = wikipedia_search(query)

    return {
        "wikipedia_results": results
    }


def news_search_node(state: State):

    intent = state["search_intent"]

    if "news" not in intent.sources:
        print("Skipping News")
        return {}

    user_question = state["user_question"]

    print(f"Searching News for: {user_question}")

    results = news_search(user_question)

    return {
        "news_results": results
    }


def youtube_search_node(state: State):

    intent = state["search_intent"]

    if "youtube" not in intent.sources:
        print("Skipping YouTube")
        return {}

    user_question = state["user_question"]

    print(f"Searching YouTube for: {user_question}")

    results = youtube_search(user_question)

    return {
        "youtube_results": results
    }


def government_search_node(state: State):

    intent = state["search_intent"]

    if "government" not in intent.sources:
        print("Skipping Government")
        return {}

    question = state["user_question"]

    print(f"Searching Government sources for: {question}")

    results = government_search(question)

    return {
        "government_results": results
    }


def analyze_reddit_posts(state: State):
    user_question = state.get("user_question", "")
    reddit_results = state.get("reddit_results", "")

    if not reddit_results:
        return {"selected_reddit_urls": []}

    messages = get_reddit_url_analysis_messages(user_question, reddit_results)

    try:
        analysis = invoke_structured(llm, messages, RedditURLAnalysis)
        selected_urls = analysis.selected_urls[:2]

        print("Selected URLs:")
        for i, url in enumerate(selected_urls, 1):
            print(f"   {i}. {url}")

    except Exception as e:
        print(e)
        selected_urls = []

    return {"selected_reddit_urls": selected_urls}


def retrieve_reddit_posts(state: State):
    print("Getting reddit post comments")

    selected_urls = state.get("selected_reddit_urls", [])

    if not selected_urls:
        return {"reddit_post_data": []}

    print(f"Processing {len(selected_urls)} Reddit URLs")

    reddit_post_data = reddit_post_retrieval(selected_urls)

    if reddit_post_data:
        print(f"Successfully got {len(reddit_post_data)} posts")
    else:
        print("Failed to get post data")
        reddit_post_data = []

    print(reddit_post_data)
    return {"reddit_post_data": reddit_post_data}


def evidence_collection_node(state: State):

    evidence = collect_evidence(state)

    print(f"Collected {len(evidence)} evidence items")

    return {
        "evidence": evidence
    }


def normalization_node(state: State):

    normalized = normalize_evidence(
        state.get("evidence", [])
    )

    print(f"Normalized {len(normalized)} evidence items")

    return {

        "normalized_evidence": normalized

    }


def evidence_ranking_node(state: State):

    ranked = rank_evidence(

        state["normalized_evidence"],

        state["user_question"]

    )

    print(f"Ranked {len(ranked)} evidence items")

    return {

        "ranked_evidence": ranked

    }


def entity_extraction_node(state: State):

    TOP_K = 4

    entities = extract_entities(

        state["ranked_evidence"][:TOP_K],

        llm

    )

    print(f"Extracted entities from {len(entities)} documents")

    return {

        "entities": entities

    }


def graph_builder_node(state: State):

    print("Building knowledge graph...")

    print(state["entities"])

    graph = build_graph(

        state["entities"],

        state["relationships"]

    )

    print(
        f"Graph contains {len(graph['nodes'])} nodes and {len(graph['edges'])} edges"
    )

    return {
        "knowledge_graph": graph
    }


def relationship_extraction_node(state: State):

    relationships = extract_relationships(

        state["entities"],

        state["ranked_evidence"],

        llm

    )

    print(
        f"Extracted relationships from {len(relationships)} documents"
    )

    return {
        "relationships": relationships
    }


def synthesize_analyses(state: State):

    print("Combining all retrieved information...")

    messages = get_synthesis_messages(

        state["user_question"],

        state["knowledge_graph"],

        state["ranked_evidence"],

        state.get("conversation_context") or "",

    )

    reply = llm.invoke(messages)

    return {

        "final_answer": reply.content,

        "messages": [

            {

                "role": "assistant",

                "content": reply.content,

            }

        ],
        "evidence_used": state["ranked_evidence"]   
    }

graph_builder = StateGraph(State)

graph_builder.add_node("detect_intent", detect_intent)

graph_builder.add_node("google_search", google_search)
graph_builder.add_node("bing_search", bing_search)
graph_builder.add_node("reddit_search", reddit_search)
graph_builder.add_node("analyze_reddit_posts", analyze_reddit_posts)
graph_builder.add_node("retrieve_reddit_posts", retrieve_reddit_posts)
graph_builder.add_node("youtube_search",youtube_search_node)
graph_builder.add_node("government_search",government_search_node)
graph_builder.add_node("evidence_collection",evidence_collection_node)
graph_builder.add_node("normalize_evidence",normalization_node)
graph_builder.add_node("github_search", github_search_node)
graph_builder.add_node("wikipedia_search", wikipedia_search_node)
graph_builder.add_node("news_search", news_search_node)
graph_builder.add_node("entity_extraction", entity_extraction_node)
graph_builder.add_node("graph_builder", graph_builder_node)
graph_builder.add_node("relationship_extraction", relationship_extraction_node)
graph_builder.add_node("evidence_ranking", evidence_ranking_node)

graph_builder.add_node("synthesize_analyses", synthesize_analyses)

# ---------------- START ----------------

graph_builder.add_edge(START, "detect_intent")

# ---------------- SEARCH NODES ----------------

graph_builder.add_edge("detect_intent", "google_search")
graph_builder.add_edge("detect_intent", "bing_search")
graph_builder.add_edge("detect_intent", "reddit_search")
graph_builder.add_edge("detect_intent", "github_search")
graph_builder.add_edge("detect_intent", "wikipedia_search")
graph_builder.add_edge("detect_intent", "news_search")
graph_builder.add_edge("detect_intent", "youtube_search")
graph_builder.add_edge("detect_intent", "government_search")

# ---------------- REDDIT RETRIEVAL ----------------

graph_builder.add_edge("google_search", "analyze_reddit_posts")
graph_builder.add_edge("bing_search", "analyze_reddit_posts")
graph_builder.add_edge("reddit_search", "analyze_reddit_posts")
graph_builder.add_edge("analyze_reddit_posts", "retrieve_reddit_posts")

# ---------------- EVIDENCE COLLECTION ----------------

graph_builder.add_edge("google_search", "evidence_collection")
graph_builder.add_edge("bing_search", "evidence_collection")
graph_builder.add_edge("github_search", "evidence_collection")
graph_builder.add_edge("wikipedia_search", "evidence_collection")
graph_builder.add_edge("news_search", "evidence_collection")
graph_builder.add_edge("youtube_search", "evidence_collection")
graph_builder.add_edge("government_search", "evidence_collection")
graph_builder.add_edge("retrieve_reddit_posts", "evidence_collection")

# ---------------- SYNTHESIS ----------------

graph_builder.add_edge("evidence_collection", "normalize_evidence")

graph_builder.add_edge("normalize_evidence", "evidence_ranking")

graph_builder.add_edge("evidence_ranking", "entity_extraction")

graph_builder.add_edge("entity_extraction","relationship_extraction")

graph_builder.add_edge("relationship_extraction","graph_builder")

graph_builder.add_edge("graph_builder","synthesize_analyses")

graph_builder.add_edge("synthesize_analyses", END)


graph = graph_builder.compile()


def run_chatbot():
    print("Multi-Source Research Agent")
    print("Type 'exit' to quit\n")

    while True:
        user_input = input("Ask me anything: ")
        if user_input.lower() == "exit":
            print("Bye")
            break

        if user_input.lower() == "clear":
            clear_conversation_history()
            print("Conversation memory cleared.")
            continue

        # Rule-based check (no embeddings, no extra LLM call): only pulls in
        # recent turns if the query actually looks referential ("it", "that",
        # "compare", etc.). Standalone questions get "" and cost no extra tokens.
        conversation_context = get_relevant_context(user_input)

        state = {
            "messages": [{"role": "user", "content": user_input}],
            "user_question": user_input,
            "google_results": None,
            "bing_results": None,
            "reddit_results": None,
            "selected_reddit_urls": None,
            "reddit_post_data": None,
            "github_results": None,
            "wikipedia_results": None,
            "news_results": None,
            "youtube_results": None,
            "government_results": None,
            "evidence":None,
            "search_intent": None,
            "normalized_evidence": None,
            "entities": None,
            "knowledge_graph": {
                                            "nodes": [],
                                            "edges": []
                                        },
            "relationships": None,
            "ranked_evidence": None,
            "evidence_used": None,
            "final_answer": None,
            "conversation_context": conversation_context,
        }

        print("\nStarting parallel research process...")
        print("\nStarting research process...\n")
        final_state = graph.invoke(state)
        print(json.dumps(final_state["knowledge_graph"], indent=2))

        if final_state.get("final_answer"):
            add_conversation_message("user", user_input)
            add_conversation_message("assistant", final_state["final_answer"])

            print(f"\nFinal Answer:\n{final_state.get('final_answer')}\n")
            print("\nEvidence Used")
            print("=" * 60)

            for i, evidence in enumerate(final_state["evidence_used"], 1):
                print(f"[{i}] {evidence['title']}")
                print(f"Source : {evidence['source']}")
                print(f"URL    : {evidence['url']}")
                print()

        print("-" * 80)


if __name__ == "__main__":
    run_chatbot()