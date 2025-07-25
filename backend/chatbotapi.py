from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx, os, difflib
from dotenv import load_dotenv
import boto3
from uuid import uuid4
from datetime import datetime

load_dotenv()
app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DynamoDB setup
dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
emotion_table = dynamodb.Table("UserEmotionLogs")  # Optional table for emotion history

# Base prompt
BASE_PROMPT = """
You are Lumi, a compassionate mental health support assistant. You help users who are feeling stressed, anxious, or overwhelmed.
You are not a medical professional and never offer clinical advice or diagnosis.
Always encourage users to reach out to licensed therapists or mental health hotlines if they are in crisis.
Keep your responses warm, empathetic, and supportive. Keep the responses concise and to the point preferrably not more than 2 sentences.
"""

# Request schema
class Message(BaseModel):
    user_input: str
    user_id: str = "demo_user"
    emotion: str = None
    stress: float = None

def get_uncompleted_habits_today(user_id: str):
    today = datetime.utcnow().date().isoformat()
    habit_table = dynamodb.Table("HabitFlowProgress")
    pending_habits = []

    response = habit_table.scan()
    for item in response.get("Items", []):
        if item.get("user_id") == user_id and item.get("is_active", False):
            last_completed = item.get("last_completed", "")
            if last_completed != today:
                pending_habits.append(item)

                # Update last_completed so we don’t remind again today
                habit_table.update_item(
                    Key={"user_id": item["user_id"], "habit_id": item["habit_id"]},
                    UpdateExpression="SET last_completed = :today",
                    ExpressionAttributeValues={":today": today}
                )

    return pending_habits

# Main chat route
@app.post("/chat")
async def chat(message: Message, request: Request):
    user_input = message.user_input.strip()
    user_id = message.user_id
    emotion = message.emotion
    stress = message.stress

    print(f"🧠 User Input: {user_input}")
    print(f"🧠 Emotion: {emotion}, Stress Score: {stress}")

    # Optional: Log emotion to DB
    if emotion or stress is not None:
        emotion_table.put_item(Item={
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "emotion": emotion or "unknown",
            "stress": stress or 0.5,
            "message": user_input
        })

     # ✅ New: Check for untriggered habits
    pending_habits = get_uncompleted_habits_today(user_id)
    if pending_habits:
        habit_names = [h["habit_name"] for h in pending_habits]
        habit_list = ", ".join(habit_names)
        encouragement = (
            f"🌱 Just a gentle reminder — don't forget your healthy habits today: {habit_list}. "
            f"You're doing great, keep going! 💪"
        )
        return {"response": encouragement}

    # Step 1: Fallback to emotion-aware response from LLM
    emotion_context = ""
    if stress and stress > 0.7:
        emotion_context = "The user appears to be highly stressed based on facial emotion detection. Please respond in a more comforting and supportive tone.\n"
    elif emotion in ["sad", "angry", "fearful"]:
        emotion_context = f"The user seems {emotion}. Be gentle and empathetic in your response.\n"

    full_prompt = f"{BASE_PROMPT.strip()}\n\n{emotion_context}User: {user_input}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://65.2.71.79:8000/query", json={"query": full_prompt}, timeout=60.0)
            if response.status_code != 200:
                print("❌ AWS RAG Error:", response.text)
                return {"response": "⚠️ AWS returned an error."}
            data = response.json()
            reply = data.get("answer") or data.get("response") or "🤖 No valid response."
            return {"response": reply.strip()}
    except Exception as e:
        import traceback
        print("🔥 Exception in /chat:", str(e))
        traceback.print_exc()
        return {"response": "🚨 Internal server error. Please try again later."}