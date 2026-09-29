import os, re
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, inspect, text

engine = create_engine(os.environ["DATABASE_URL"])
client = anthropic.Anthropic()
MODEL = os.getenv("MODEL", "claude-sonnet-5-5")
RESTRICTED = {"employees_salary"}
BAD = re.compile(r"\b(insert|update|delete|drop|alter|truncate|create|grant|exec)\b", re.I)
KW = {"join", "on", "where", "group", "order", "limit", "inner", "left", "right"}

app = FastAPI(title="Guardrails API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class Ask(BaseModel):
    question: str


def schema():
    i = inspect(engine)
    return {t: [c["name"] for c in i.get_columns(t)] for t in i.get_table_names() if t not in RESTRICTED}


def llm(prompt, system):
    r = client.messages.create(model=MODEL, max_tokens=500, system=system,
                               messages=[{"role": "user", "content": prompt}])
    return r.content[0].text.strip().strip("`").removeprefix("sql").strip()


def guard(sql):
    s = sql.strip().rstrip(";")
    if ";" in s or "--" in s or "/*" in s:
        return "multi-statement or comment"
    if not re.match(r"(select|with)\b", s, re.I) or BAD.search(s):
        return "not read-only"
    if any(re.search(rf"\b{t}\b", s, re.I) for t in RESTRICTED):
        return "restricted table"


def grounding(sql, sch):
    al, issues = {}, []
    for t, a in re.findall(r"\b(?:from|join)\s+(\w+)(?:\s+(?:as\s+)?(\w+))?", sql, re.I):
        al[a if a and a.lower() not in KW else t] = t
        if t not in sch:
            issues.append(f"unknown table {t}")
    for a, c in re.findall(r"\b(\w+)\.(\w+)\b", sql):
        if a in al and al[a] in sch and c not in sch[al[a]]:
            issues.append(f"unknown column {a}.{c}")
    return issues


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/query")
def query(body: Ask):
    sch = schema()
    system = f"Write ONE read-only PostgreSQL SELECT for this schema: {sch}. Output SQL only."
    sql = llm(body.question, system)
    if (why := guard(sql)):
        raise HTTPException(403, f"Blocked: {why}")
    issues = grounding(sql, sch)
    if issues:  # one self-repair attempt
        sql = llm(f"{body.question}\nFix these problems: {issues}\nPrevious SQL: {sql}", system)
        if guard(sql) or (issues := grounding(sql, sch)):
            raise HTTPException(422, f"Hallucination not repairable: {issues}")
    score = llm(f"Question: {body.question}\nSQL: {sql}\nRate 0-100 how well the SQL answers it. Number only.",
                "You are a strict SQL reviewer.")
    conf = int(re.sub(r"\D", "", score) or 0)
    if conf < 70:
        raise HTTPException(422, f"Judge confidence too low: {conf}")
    if not re.search(r"\blimit\b", sql, re.I):
        sql += " LIMIT 100"
    with engine.connect() as c:
        c.execute(text("SET TRANSACTION READ ONLY"))
        c.execute(text("SET LOCAL statement_timeout = 5000"))
        rows = [dict(r) for r in c.execute(text(sql)).mappings().fetchmany(100)]
    return {"sql": sql, "confidence": conf, "rows": rows}
