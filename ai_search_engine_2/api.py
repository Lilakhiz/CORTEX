import asyncio
import json
import sys

# Windows consoles default stdout/stderr to a legacy codepage (e.g. cp1252)
# that can't encode arbitrary unicode (em dashes, non-breaking hyphens, etc.)
# coming back from LLM responses. The many print() calls throughout this
# pipeline would otherwise crash requests with UnicodeEncodeError -> 500.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any

# Importing `graph` from `main` triggers heavy initialization at import
# time (LLM init, network calls, etc.) which can cause ASGI load failures.
# Import `graph` lazily inside handlers to avoid import-time side effects.

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cortex-explore.netlify.app",
        "http://10.65.13.107:3000",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://10.61.122.5:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    query: str

class NodeChatRequest(BaseModel):
    question: str
    node_name: str
    node_type: str
    graph_context: str = ""
    evidence: List[Dict[str, Any]] = []

# Stage definitions matching the frontend
SEARCH_STAGES = [
    {"id": "detect_intent", "label": "Understanding query", "icon": "Brain", "duration": 2000},
    {"id": "google_search", "label": "Searching Google", "icon": "Search", "duration": 3000},
    {"id": "bing_search", "label": "Searching Bing", "icon": "Search", "duration": 3000},
    {"id": "reddit_search", "label": "Searching Reddit", "icon": "Share2", "duration": 3000},
    {"id": "github_search", "label": "Searching GitHub", "icon": "GitBranch", "duration": 3000},
    {"id": "wikipedia_search", "label": "Searching Wikipedia", "icon": "Search", "duration": 2000},
    {"id": "news_search", "label": "Searching News", "icon": "Search", "duration": 2000},
    {"id": "youtube_search", "label": "Searching YouTube", "icon": "Search", "duration": 2000},
    {"id": "government_search", "label": "Searching Government", "icon": "Search", "duration": 2000},
    {"id": "analyze_reddit_posts", "label": "Analyzing Reddit posts", "icon": "Brain", "duration": 2000},
    {"id": "retrieve_reddit_posts", "label": "Retrieving Reddit posts", "icon": "Share2", "duration": 3000},
    {"id": "evidence_collection", "label": "Collecting evidence", "icon": "Search", "duration": 2000},
    {"id": "normalize_evidence", "label": "Normalizing evidence", "icon": "Brain", "duration": 1500},
    {"id": "evidence_ranking", "label": "Ranking evidence", "icon": "Brain", "duration": 1500},
    {"id": "entity_extraction", "label": "Extracting entities", "icon": "Brain", "duration": 2000},
    {"id": "relationship_extraction", "label": "Extracting relationships", "icon": "GitBranch", "duration": 2000},
    {"id": "graph_builder", "label": "Building knowledge graph", "icon": "GitBranch", "duration": 2000},
    {"id": "synthesize_analyses", "label": "Synthesizing answer", "icon": "Brain", "duration": 3000},
]

# Store active SSE connections
active_streams = {}


def _get_graph():
    """Lazily import and return the compiled `graph` from `main`.

    Importing `main` at module import time triggers heavy initialization
    (LLM setup, network calls). This helper delays that until a request
    actually needs the graph, preventing ASGI app load errors.
    """
    try:
        from main import graph as _graph
        return _graph
    except Exception as e:
        raise RuntimeError(f"Failed to import graph from main: {e}")


def _get_llm():
    """Lazily import and return the LLM from main."""
    try:
        from main import llm as _llm
        return _llm
    except Exception as e:
        raise RuntimeError(f"Failed to import LLM from main: {e}")


def _get_prompts():
    """Lazily import prompts from main."""
    try:
        from prompts import get_synthesis_messages
        return get_synthesis_messages
    except Exception as e:
        raise RuntimeError(f"Failed to import prompts: {e}")


async def run_graph_with_streaming(query: str, stream_id: str):
    """Run the graph and yield progress events via SSE."""
    
    # Queue for progress events
    progress_queue = asyncio.Queue()
    active_streams[stream_id] = progress_queue
    
    # Track completed stages
    completed_stages = set()
    
    async def progress_emitter():
        """Emit progress events based on graph execution."""
        # Initial state
        start_event = {"type": "start", "stages": SEARCH_STAGES}
        yield f"data: {json.dumps(start_event)}\n\n"
        
        # Stage order matching the graph
        stage_order = [
            "detect_intent",
            "google_search", "bing_search", "reddit_search", "github_search", 
            "wikipedia_search", "news_search", "youtube_search", "government_search",
            "analyze_reddit_posts", "retrieve_reddit_posts",
            "evidence_collection", "normalize_evidence", "evidence_ranking",
            "entity_extraction", "relationship_extraction", "graph_builder", "synthesize_analyses"
        ]
        
        for i, stage_id in enumerate(stage_order):
            # Check if stream is still active
            if stream_id not in active_streams:
                break
                
            # Emit stage start
            stage_start_event = {"type": "stage_start", "stage": stage_id, "index": i}
            yield f"data: {json.dumps(stage_start_event)}\n\n"
            completed_stages.add(stage_id)
            
            # Emit progress
            progress_event = {"type": "progress", "completed": list(completed_stages), "current": stage_id}
            yield f"data: {json.dumps(progress_event)}\n\n"
            
            # Small delay to show progression
            await asyncio.sleep(0.1)
        
        # Run the actual graph (import graph lazily to avoid import-time side effects)
        try:
            graph = _get_graph()
            result = graph.invoke({
                "user_question": query,
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
                "knowledge_graph": {"nodes": [], "edges": []},
                "relationships": None,
                "ranked_evidence": None,
                "evidence_used": None,
                "final_answer": None,
                "conversation_context": "",
            })
            
            complete_event = {
                "type": "complete", 
                "result": {
                    "answer": result.get("final_answer", ""),
                    "graph": result.get("knowledge_graph", {"nodes": [], "edges": []}),
                    "evidence": result.get("evidence_used", [])
                }
            }
            yield f"data: {json.dumps(complete_event)}\n\n"
        except Exception as e:
            error_event = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"
        finally:
            if stream_id in active_streams:
                del active_streams[stream_id]
    
    return progress_emitter()


@app.post("/search")
async def search(req: SearchRequest):
    """Non-streaming search endpoint (backward compatible)."""
    try:
        print("=" * 60)
        print("QUERY RECEIVED:", req.query)
        print("=" * 60)

        graph = _get_graph()
        result = graph.invoke({
            "user_question": req.query,
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
            "knowledge_graph": {"nodes": [], "edges": []},
            "relationships": None,
            "ranked_evidence": None,
            "evidence_used": None,
            "final_answer": None,
            "conversation_context": "",
        })

    except Exception as e:
        print(e)
        return {
            "answer": "Backend error",
            "graph": {"nodes": [], "edges": []},
            "evidence": []
        }

    return {
        "answer": result["final_answer"],
        "graph": result["knowledge_graph"],
        "evidence": result["evidence_used"]
    }


@app.get("/search/stream")
async def search_stream(query: str):
    """SSE endpoint for streaming search progress."""
    import uuid
    stream_id = str(uuid.uuid4())[:8]
    
    async def event_generator():
        async for event in run_graph_with_streaming(query, stream_id):
            yield event
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/ask")
async def ask_node(req: NodeChatRequest):
    """Ask a question about a specific node in the knowledge graph."""
    try:
        # Get the LLM (same one used by the graph)
        llm = _get_llm()
        
        # Format evidence for the prompt
        evidence_text = ""
        if req.evidence:
            evidence_text = "\n\nEVIDENCE:\n"
            for i, ev in enumerate(req.evidence, 1):
                title = ev.get("title", "(untitled)")
                source = ev.get("source", "unknown")
                url = ev.get("url", "")
                content = (ev.get("content") or "").strip()
                evidence_text += f"[{i}] {title} (source: {source})\nURL: {url}\n{content}\n\n"
        else:
            evidence_text = "\n\nEVIDENCE:\nNo evidence available for this node.\n"
        
        # Build the prompt
        system_prompt = """You are Cortex, an expert assistant answering a follow-up question about a
specific entity from a knowledge graph — think and respond the way ChatGPT
would: direct, confident, well-reasoned, no filler.

You will be given:
1. The entity name and type
2. Graph context (relationships involving this entity)
3. Evidence specific to this entity (may be empty or only loosely related)
4. A user question

Use the evidence and graph context when they genuinely help. But you are not
limited to them: if the evidence is missing, thin, or doesn't actually
address what's being asked, set it aside and answer from your own knowledge
and reasoning instead. Never say the evidence is insufficient or apologize
for a lack of sources — just answer the question correctly. Cite evidence
with [1], [2], etc. only for claims that actually come from it; don't
fabricate citations, and don't force a "based on the sources" framing onto
an answer that's really general knowledge."""

        user_prompt = f"""ENTITY: {req.node_name}
TYPE: {req.node_type}

GRAPH CONTEXT:
{req.graph_context or "No graph context available."}

{evidence_text}

USER QUESTION:
{req.question}

Answer the question directly. Use the evidence above where it's relevant; where it isn't, rely on your own knowledge and reasoning instead."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        
        # Get response from LLM
        response = llm.invoke(messages)
        
        return {"answer": response.content}
        
    except Exception as e:
        print(f"Error in /ask endpoint: {e}")
        return {"answer": f"Error processing request: {str(e)}"}


@app.get("/")
def root():
    return {"message": "API is working"}