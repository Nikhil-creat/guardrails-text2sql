# Guardrails: Text-to-SQL with hallucination detection

- **Live demo (static, GitHub Pages):** open `index.html`. It simulates the whole pipeline in the browser.
- **Real backend:** `cp` your key into `.env` (`ANTHROPIC_API_KEY=...`), then run `docker compose up --build`. Docs at http://localhost:8000/docs, POST `/query` with `{"question": "..."}`.

Pipeline: intent, SQL draft, guardrails (read-only, single statement, no comments, restricted tables, row cap), schema grounding with auto-repair, LLM-as-judge, read-only execution.

Built by Nikhil Chary Sriramoju.

## Designed and developed by

**NIKHIL CHARY SRIRAMOJU**
BTech CSE (Final Year)

- GitHub: [Nikhil-creat](https://github.com/Nikhil-creat)
- LinkedIn: [nikhil-chary-sriramoju](https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a)
- Email: sriramojunikhil66@gmail.com
- Instagram: [@nikhil__sriramoju](https://www.instagram.com/nikhil__sriramoju)
- Facebook: [Profile](https://www.facebook.com/profile.php?id=100079201124141)
