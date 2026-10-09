from database import supabase
from ai_grouping import group_similar_errors
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LogMind AI Backend")

# Allow React frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "LogMind AI Backend Running",
        "status": "success"
    }

@app.get("/analyses")
def get_analyses():

    response = (
        supabase.table("log_analyses")
        .select("*")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return {
        "status": "success",
        "total": len(response.data),
        "analyses": response.data
    }
@app.post("/analyze")
async def analyze_logs(file: UploadFile = File(...)):

    filename = file.filename or ""

    if not filename.lower().endswith((".log", ".txt")):
        raise HTTPException(
            status_code=400,
            detail="Only .log and .txt files are allowed"
        )

    content = await file.read(5 * 1024 * 1024 + 1)

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 5 MB"
        )

    text = content.decode("utf-8", errors="replace")

    logs = [
        line for line in text.splitlines()
        if line.strip()
    ]

    errors = sum(
        1 for log in logs
        if "ERROR" in log.upper()
    )

    warnings = sum(
        1 for log in logs
        if "WARNING" in log.upper()
        or "WARN" in log.upper()
    )

       # STEP 1: Prepare analysis results
    result = {
        "filename": filename,
        "total_logs": len(logs),
        "errors": errors,
        "warnings": warnings,
        "status": "Analysis Complete"
    }

    # STEP 2: Group similar errors using AI
    incidents = group_similar_errors(logs)

    # STEP 3: Save the analysis summary to Supabase
    supabase.table("log_analyses").insert(result).execute()

    # STEP 4: Return results with AI incident groups
    return {
        **result,
        "incidents": incidents
    }