# Guardrails: Text-to-SQL with hallucination detection

- **Live demo (static, GitHub Pages):** open `index.html`. It simulates the whole pipeline in the browser.
- **Real backend:** `cp` your key into `.env` (`ANTHROPIC_API_KEY=...`), then run `docker compose up --build`. Docs at http://localhost:8000/docs, POST `/query` with `{"question": "..."}`.

Pipeline: intent, SQL draft, guardrails (read-only, single statement, no comments, restricted tables, row cap), schema grounding with auto-repair, LLM-as-judge, read-only execution.

Built by Nikhil Chary Sriramoju.
