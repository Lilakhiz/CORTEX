# CORTEX

### An AI-Powered Research Engine for the Modern Web

> **Search less. Understand more.**

Cortex is an AI-powered research and intelligence platform designed to transform fragmented information from across the web into structured, contextual, and actionable knowledge.

Instead of treating search as a list of links, Cortex treats research as a **connected information problem**.

It discovers information across multiple sources, analyzes the results, identifies relationships between findings, and synthesizes them into a coherent research experience.

---

## Overview

Modern information retrieval is fundamentally broken by fragmentation.

A single research question can require navigating search engines, news platforms, community discussions, documentation, repositories, and reference sources — each producing information in a different format with different levels of reliability and context.

Cortex brings these sources together into a unified research pipeline.

```text
                        USER QUERY
                            |
                            v
                  +-------------------+
                  |   Intent Analysis |
                  +-------------------+
                            |
                            v
                  +-------------------+
                  | Research Planner |
                  +-------------------+
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
          Search          News         Knowledge
          Sources         Sources        Sources
             |              |              |
             +--------------+--------------+
                            |
                            v
                  +-------------------+
                  | Source Analysis   |
                  +-------------------+
                            |
                            v
                  +-------------------+
                  | Context Fusion    |
                  +-------------------+
                            |
                            v
                  +-------------------+
                  | AI Synthesis      |
                  +-------------------+
                            |
                            v
                  +-------------------+
                  | Research Graph    |
                  +-------------------+
                            |
                            v
                     CORTEX RESULT
```

The result is not simply an answer.

It is a **research workspace built around the relationships between information.**

---

# Why Cortex?

Traditional search engines optimize for retrieval.

Cortex is designed around **understanding**.

| Traditional Search          | Cortex                               |
| --------------------------- | ------------------------------------ |
| Returns links               | Builds context                       |
| One source at a time        | Multi-source research                |
| Search → click → repeat     | Search → analyze → synthesize        |
| Information is fragmented   | Information is connected             |
| Results are mostly static   | Results become a knowledge structure |
| User performs the synthesis | AI assists with synthesis            |

Cortex is designed for questions where the answer cannot be found reliably on a single webpage.

---

# Core Capabilities

## Multi-Source Research

Cortex can orchestrate research across multiple information sources rather than relying on a single search provider.

The architecture is designed to combine heterogeneous information and process each source according to its characteristics.

Sources currently integrated into the research pipeline include:

* Google
* Bing
* Reddit
* GitHub
* Wikipedia
* News sources

This allows a single research query to become a broader information-gathering process.

---

## Intent-Aware Research

Not every query should be researched in the same way.

Cortex first determines what the user is actually trying to accomplish and uses that intent to influence the downstream research process.

```text
User Query
    |
    v
Intent Detection
    |
    +---- Informational
    |
    +---- Comparative
    |
    +---- Technical
    |
    +---- Exploratory
    |
    +---- Research-oriented
    |
    v
Research Strategy
```

This allows Cortex to move beyond simple keyword matching toward **query-aware research orchestration**.

---

## Source-Specific Analysis

Different sources contain different kinds of information.

A GitHub repository is fundamentally different from a Reddit discussion.

A Wikipedia article is different from a breaking-news report.

Cortex therefore separates retrieval from analysis and allows information to be processed according to its source and context.

This creates a pipeline where:

```text
Retrieval
    ↓
Source Classification
    ↓
Source-Specific Analysis
    ↓
Cross-Source Context
    ↓
Synthesis
```

rather than blindly feeding every result into one generic prompt.

---

# Research as a Graph

One of Cortex's defining concepts is representing research as a connected graph.

Instead of presenting information as:

```text
Result 1
Result 2
Result 3
Result 4
Result 5
```

Cortex can represent information as:

```text
                    ┌──────────────┐
                    │   Discovery  │
                    └──────┬───────┘
                           /
                          /
             ┌───────────┴───────────┐
             │                       │
        ┌────▼────┐             ┌────▼────┐
        │ Research│────────────▶│ Finding │
        │ Context │             │    A    │
        └────┬────┘             └────┬────┘
             │                       │
             │                  ┌────▼────┐
             └─────────────────▶│ Finding │
                                │    B    │
                                └────┬────┘
                                     │
                                ┌────▼────┐
                                │ Source  │
                                └─────────┘
```

Each piece of information becomes part of a larger context.

This makes the system naturally suited to exploratory research, where the relationship between facts can be just as important as the facts themselves.

---

# Architecture

Cortex is split into a frontend and backend architecture.

```text
                         CORTEX
                           |
             +-------------+-------------+
             |                           |
             v                           v
      React / Vite                  FastAPI
       Frontend                    Backend API
             |                           |
             |                           v
             |                    Research Pipeline
             |                           |
             |              +------------+------------+
             |              |            |            |
             |              v            v            v
             |          Search        News        Knowledge
             |          Sources       Sources       Sources
             |              |            |            |
             |              +------------+------------+
             |                           |
             |                           v
             |                     AI Analysis
             |                           |
             |                           v
             |                      Synthesis
             |                           |
             +---------------------------+
                         |
                         v
                  Research Interface
```

---

# Technology Stack

### Frontend

* React
* Vite
* JavaScript / TypeScript ecosystem
* Interactive research visualization
* Modern component-based UI

### Backend

* Python
* FastAPI
* LangGraph
* Asynchronous research orchestration

### AI

* Groq
* LLM-powered intent analysis
* Source-specific reasoning
* Cross-source synthesis

### Retrieval

* Google
* Bing
* Reddit
* GitHub
* Wikipedia
* News APIs
* Tavily

### Supporting Infrastructure

* Environment-based configuration
* API-based service integration
* Modular research pipeline
* Frontend/backend separation

---

# LangGraph Research Pipeline

Cortex uses a graph-based backend architecture to orchestrate the research process.

A simplified representation:

```text
                 +----------------+
                 |     Query      |
                 +-------+--------+
                         |
                         v
                 +----------------+
                 | Intent Detector|
                 +-------+--------+
                         |
                         v
                 +----------------+
                 |   Retrieval    |
                 +-------+--------+
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
          Google      Reddit       GitHub
             |           |           |
             +-----------+-----------+
                         |
                         v
                 +----------------+
                 | Source Analysis |
                 +-------+--------+
                         |
                         v
                 +----------------+
                 |    Synthesis    |
                 +-------+--------+
                         |
                         v
                 +----------------+
                 | Final Research  |
                 +----------------+
```

The graph architecture makes the system extensible.

Additional sources, specialized analysis nodes, validation stages, ranking mechanisms, and research agents can be introduced without rebuilding the entire application.

---

# Information Flow

A typical Cortex request follows this lifecycle:

### 01 — Query

The user submits a research question.

### 02 — Intent

The system determines the nature of the request and identifies an appropriate research strategy.

### 03 — Retrieval

Relevant information is collected from multiple external sources.

### 04 — Filtering

Retrieved information is processed and organized before synthesis.

### 05 — Analysis

Individual sources are analyzed according to their context and type.

### 06 — Synthesis

The AI combines the relevant information into a unified understanding.

### 07 — Visualization

The resulting research can be represented through the Cortex interface and its connected information model.

---

# Project Structure

```text
CORTEX/
│
├── ai_search_engine_2/
│   └── Backend / FastAPI / Research Engine
│
├── cortex-main/
│   └── Frontend / React / Vite
│
├── docs/
│   └── Project documentation
│
├── start.bat
│   └── Windows startup script
│
├── start.sh
│   └── Linux/macOS startup script
│
├── .env.example
│   └── Environment variable template
│
└── README.md
```

The separation between the research backend and interactive frontend allows Cortex to evolve independently on both sides of the application.

---

# Running Cortex Locally

## Prerequisites

Make sure the following are installed:

* Python
* Node.js
* npm
* Git

Depending on the configured environment, additional package managers may also be supported.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Lilakhiz/CORTEX.git
cd CORTEX
```

---

## 2. Configure Environment Variables

Copy the provided environment templates.

The backend requires credentials for the configured AI and research services.

Example:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
NEWS_API_KEY=your_news_api_key
```

The frontend requires its own environment configuration where applicable.

Never commit real API keys to the repository.

---

## 3. Start Cortex

### Windows

```powershell
.\start.bat
```

### Linux / macOS

```bash
chmod +x start.sh
./start.sh
```

The startup scripts launch both sides of the application.

```text
Frontend
http://localhost:3000

Backend
http://localhost:8000

API Documentation
http://localhost:8000/docs
```

---

# Configuration

Cortex uses environment variables to separate application configuration from secrets.

A typical setup looks like:

```text
.env.example
      |
      v
Copy / configure
      |
      v
.env
      |
      v
Application
```

The repository intentionally provides configuration templates rather than exposing credentials.

---

# Design Philosophy

Cortex is built around several principles.

### Research Over Retrieval

Finding information is only the beginning.

The real problem is understanding how information relates.

### Context Over Volume

More search results do not necessarily mean better research.

Cortex focuses on extracting useful context from retrieved information.

### Modular Intelligence

Research systems should evolve.

The underlying graph architecture allows new sources, processing stages, and intelligence modules to be introduced independently.

### Human-Centered Exploration

AI should reduce the cognitive overhead of research without removing the user's ability to explore the underlying information.

### Source Diversity

Important information rarely lives in one place.

Different sources provide different perspectives, levels of technical depth, and types of evidence.

Cortex embraces that diversity.

---

# What Makes Cortex Different?

Cortex is not intended to be another wrapper around a search API.

Its central idea is to treat research as a **pipeline of connected reasoning stages**.

```text
                    SEARCH
                      |
                      v
                 DISCOVER
                      |
                      v
                  ANALYZE
                      |
                      v
                 CONNECT
                      |
                      v
                 SYNTHESIZE
                      |
                      v
                 UNDERSTAND
```

The objective is to move the user from:

> "Here are some links."

to:

> "Here is what the information means, where it came from, and how the pieces connect."

---

# Roadmap

Cortex v1 establishes the foundation for a much larger research system.

Potential future directions include:

* Semantic research graphs
* Chronological research graphs
* Deeper source credibility analysis
* Citation-aware synthesis
* Research sessions and persistent workspaces
* Automatic topic clustering
* Entity relationship extraction
* Interactive knowledge graphs
* Follow-up research agents
* Long-running research tasks
* Personalized research memory
* Collaborative research workspaces
* Automated research reports
* More retrieval providers
* Advanced source comparison
* Local and private model support

The architecture is intentionally designed to make these extensions possible without fundamentally changing the core system.

---

# Security

Cortex uses environment variables for sensitive configuration.

Do not commit:

```text
.env
.env.local
*.env
```

to version control.

Use:

```text
.env.example
```

for documenting required variables.

If a credential is accidentally committed, rotate the credential immediately and remove the secret from Git history before publishing the repository.

---

# Development

Contributions, experiments, and architectural improvements are welcome.

When extending Cortex, prefer modular additions over tightly coupling new functionality to the existing research pipeline.

A useful mental model is:

```text
New Capability
      |
      v
New Node / Service / Source
      |
      v
Existing Research Graph
      |
      v
Expanded Intelligence
```

---

# Project Status

**Cortex v1.0**

The first complete version of the Cortex research platform.

The project currently provides the foundation for multi-source AI-assisted research through a graph-oriented backend and an interactive frontend.

---

# Author

### Akhilesh

Computer Science undergraduate and builder focused on AI systems, intelligent agents, research infrastructure, and developer tools.

GitHub:
https://github.com/Lilakhiz

---

# License

This project is currently distributed for educational and research purposes.

See the repository for the applicable license and usage terms.

---

<div align="center">

## CORTEX

**A research engine built around connections, context, and intelligence.**

*Search is retrieval. Research is understanding.*

</div>
