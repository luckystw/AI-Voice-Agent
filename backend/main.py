from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory feedback store
feedback_store = []

@app.get("/")
def root():
    return {"message": "Voie AI Agent Backend Running"}

@app.post("/transcribe")
async def transcribe(request: Request):
    data = await request.json()
    # Mock: just echo back the text as transcript
    transcript = data.get("audio_text", "")
    return {"transcript": transcript}

@app.post("/analyze")
async def analyze(request: Request):
    data = await request.json()
    transcript = data.get("transcript", "")
    # Mock sentiment/keywords/decision
    sentiment = "confident" if "yes" in transcript.lower() else "neutral"
    keywords = [word for word in transcript.split() if word.istitle()]
    decision = "Escalate" if "help" in transcript.lower() else "Close"
    reasoning = [
        {"step": "Transcription", "value": transcript},
        {"step": "Sentiment", "value": sentiment},
        {"step": "Keywords", "value": keywords},
        {"step": "Decision", "value": decision},
    ]
    return {"sentiment": sentiment, "keywords": keywords, "decision": decision, "reasoning": reasoning}

@app.get("/feedback")
def feedback():
    return {"feedback": feedback_store}

@app.post("/feedback")
async def add_feedback(request: Request):
    data = await request.json()
    # Expecting: {"candidate": ..., "decision": ..., "insight": ...}
    feedback_store.append(data)
    return {"success": True, "feedback": feedback_store} 