# KalPad: AI-Native Study Planner

*Note: I originally built KalPad as a private tool to solve my own problem with academic structural chaos. It evolved into a beta with 90+ active users. I want to be radically transparent: because I was a solo developer optimizing for speed-to-market, I heavily leveraged AI (vibe-coding) to generate the React frontend boilerplate quickly. The UI code and commit history reflect "builder mode." However, the core backend architecture, the multi-agent orchestration, the deterministic scheduling algorithm, and the RAG pipelines were entirely hand-designed by me to solve problems standard CRUD apps cannot.*

## The Core Problem
Modern students do not fail from a lack of intelligence or content. They fail from **structural chaos**. The "meta-work" of breaking down a 50-page syllabus, finding prerequisites, and mathematically scheduling it causes planning paralysis. 

A standard CRUD application just gives a student an empty database to type their tasks into; it only *stores* the plan. KalPad uses agentic AI to *create* the plan, automating the meta-work and replacing unmanaged anxiety with a highly structured, hallucination-free path to mastery.

## Our Quality Standard: Cognitive Scaffolding
We do not build "chatbots." Generic AI gives a student the answer, which kills the learning process. KalPad gives the student the strategy, tools, and framework to find the answer themselves. 
- We prioritize deterministic logic (JavaScript schedulers) over probabilistic AI guessing. 
- We demand zero-hallucination citations via Strict RAG. 
- We favor brutal honesty over algorithmic people-pleasing.

---

## 🏗️ The Architecture & Tech Stack

KalPad utilizes a hybrid-cloud, serverless microservices architecture, prioritizing blistering speed on the frontend and isolated, heavy-compute environments for backend generation.

* **Frontend:** Next.js 14+ (App Router), React 19, Mantine UI.
* **Backend API & Orchestration:** Next.js Serverless Functions & Inngest (Background Job Pipelines).
* **Visual Microservices:** Google Cloud Run (Dockerized Python/Node.js environments).
* **Database & BaaS:** Supabase (PostgreSQL), `pgvector` for semantic search, Auth, and Storage.
* **AI Engine:** Google Cloud Vertex AI (Gemini 2.5 Flash/Pro) for heavy reasoning, Groq (Llama 3) for sub-second real-time tutoring.

---

## ⚙️ The Core Pipelines 

KalPad is powered by interconnected, multi-agent pipelines:

### 1. The Manifesto-Driven Plan Generator
We solved the "LLM Knapsack Problem" by permanently decoupling mathematical scheduling from creative writing.
* **Phase 1 (Triage Agents):** Vertex AI analyzes the syllabus, scores topic relevance, and identifies prerequisites.
* **Phase 2 (Deterministic Scheduler):** A pure JavaScript algorithm takes over. It performs topological sorting, breaks circular dependencies, and mathematically packs topics into strict daily hour limits. *Zero AI hallucination on time management.*
* **Phase 3 (Week Enricher):** Vertex AI acts strictly as a writer constrained by the JS schedule, writing actionable tasks and injecting university-grade exam problems.

### 2. The Multimodal RAG Notes Pipeline
* **Intelligent Ingestion:** Client-side parsing extracts text and images from uploaded PDFs, storing them in a `pgvector` database.
* **Two-Shot Authoring:** An "Outliner" agent designs the pedagogy (mandating MISCONCEPTION blocks). The "Author" agent executes the outline, ensuring notes anticipate where a student will fail.

### 3. The Cram Sheet Forge (MapReduce Architecture)
* **The Miner (Map):** Iterates through an entire semester of notes in parallel, extracting key formulas (in valid LaTeX) and critical exam traps.
* **The Global Architect & Assembler (Reduce):** Analyzes all extracted data, spots duplicate formulas across days, and assigns strict word budgets per section. Pure JS stitches it together.

### 4. The Illustrator Agent (Visual Microservices)
Heavy binary rendering is completely isolated from the Vercel frontend to ensure zero cold-start lag.
* An asynchronous Inngest pipeline delegates payloads to Dockerized Google Cloud Run microservices (`matplotlib-foundry` in Python, `mermaid-forge` in Node) to render custom SVG diagrams, seamlessly injecting them back into the user's notes.

### 5. The "2 AM Doubt Solver" 
Powered by **Groq (Llama 3)** for sub-second inference. It acts as a Socratic tutor—explaining concepts based strictly on the context of the user's current active reading pane, explicitly prompted to *never do the student's homework*.

---

## 🗄️ Database Schema Overview

KalPad relies on a fully relational PostgreSQL database with strict Row Level Security (RLS) for multi-tenant isolation.
* `study_plans`: Master record for a generated syllabus plan.
* `plan_topics`: Daily timeline entries (1-to-many with `study_plans`).
* `generated_notes`: Single source of truth for RAG output.
* `documents`: Unified RAG knowledge base storing `text_chunk` (with 768-dim `embedding`) and `image_page` types.

---

## 💻 Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/kalpad-os.git
cd kalpad-os
npm install
