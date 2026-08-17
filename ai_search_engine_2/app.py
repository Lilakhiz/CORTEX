import sys

# Windows consoles default stdout/stderr to a legacy codepage (e.g. cp1252)
# that can't encode arbitrary unicode (em dashes, non-breaking hyphens, etc.)
# coming back from LLM responses. The many print() calls throughout this
# pipeline would otherwise crash requests with UnicodeEncodeError -> 500.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from typing import Optional, List

from main import (
    graph,
    State,
)
from conversation_memory import (
    add_message as add_conversation_message,
    get_relevant_context,
    clear_history as clear_conversation_history,
)
from langchain_nvidia_ai_endpoints import ChatNVIDIA

app = FastAPI(title="AI Search Engine API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    # Accept both field names for compatibility
    question: Optional[str] = None
    query: Optional[str] = None

    @property
    def text(self) -> str:
        return self.question or self.query or ""


class QueryResponse(BaseModel):
    # Return both field names for frontend compatibility
    final_answer: str
    answer: str
    evidence_used: List[dict]
    evidence: List[dict]
    knowledge_graph: dict
    graph: dict


# --- Node Chat models ---
class NodeChatRequest(BaseModel):
    question: str
    node_name: str
    node_type: str
    graph_context: str
    evidence: List[dict]


class NodeChatResponse(BaseModel):
    answer: str


@app.post("/search", response_model=QueryResponse)
async def search(request: QueryRequest):
    """
    Process a search query and return the answer with evidence.
    """
    print(f"Received request: {request}")
    try:
        user_input = request.text

        # Get conversation context for multi-turn conversations
        conversation_context = get_relevant_context(user_input)

        # Initialize state
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
            "evidence": None,
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

        # Run the research graph
        print("Running research process...")
        final_state = graph.invoke(state)

        # Save to conversation memory
        if final_state.get("final_answer"):
            add_conversation_message("user", user_input)
            add_conversation_message("assistant", final_state["final_answer"])

        # Prepare response
        final_answer = final_state.get("final_answer", "")
        evidence_used = final_state.get("evidence_used", [])
        knowledge_graph = final_state.get("knowledge_graph", {"nodes": [], "edges": []})

        return QueryResponse(
            final_answer=final_answer,
            answer=final_answer,
            evidence_used=evidence_used,
            evidence=evidence_used,
            knowledge_graph=knowledge_graph,
            graph=knowledge_graph
        )

    except Exception as e:
        print(f"Error during search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clear-history")
async def clear_history():
    """
    Clear the conversation history.
    """
    try:
        clear_conversation_history()
        return {"message": "Conversation history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """
    Health check endpoint.
    """
    return {"status": "ok"}


# --- Node Chat endpoints ---
@app.post("/ask", response_model=NodeChatResponse)
async def ask_node(request: NodeChatRequest):
    """
    Answer a question about a specific knowledge graph node using pre-loaded context and evidence.
    """
    try:
        llm = ChatNVIDIA(model="nvidia/nemotron-3-super-120b-a12b", timeout=120)

        # Build a focused prompt using the node context and evidence
        evidence_text = "\n\n".join([
            f"Source: {e.get('source', 'unknown')}\nTitle: {e.get('title', 'Untitled')}\nContent: {e.get('content', '')[:500]}"
            for e in request.evidence[:5]
        ])

        prompt = f"""You are Cortex, an expert assistant helping the user understand a specific entity
from a knowledge graph — respond the way ChatGPT would: direct, confident,
well-reasoned, no filler.

Node: {request.node_name} ({request.node_type})
Graph Context: {request.graph_context}

Relevant Evidence:
{evidence_text}

User Question: {request.question}

Use the evidence and graph context where they're genuinely relevant, citing
them naturally. If the evidence is missing, thin, or doesn't actually answer
the question, set it aside and answer from your own knowledge and reasoning
instead - don't say the evidence is insufficient or apologize, just answer
correctly and concisely."""

        response = llm.invoke(prompt)

        return NodeChatResponse(answer=response.content)

    except Exception as e:
        print(f"Error during node chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask/clear")
async def clear_node_chat():
    """
    Clear any node-specific chat state (currently stateless, but kept for API compatibility).
    """
    return {"message": "Node chat context cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)