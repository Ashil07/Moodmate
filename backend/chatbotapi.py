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
dynamodb = boto3.resource("dynamodb")
goal_table = dynamodb.Table("UserGoals")

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

# Affirmation detection
def is_affirmation(text: str) -> bool:
    affirmations = ["yes", "sure", "okay", "ok", "sounds good", "i did", "i completed it", "done"]
    return bool(difflib.get_close_matches(text.lower(), affirmations, n=1, cutoff=0.8))

# Goal helpers
def get_active_goals(user_id: str):
    response = goal_table.scan()
    return [item for item in response.get("Items", []) if item.get("user_id") == user_id and item.get("status") == "active"]

def complete_goal(user_id: str, goal_type: str):
    response = goal_table.scan()
    for item in response.get("Items", []):
        if item["user_id"] == user_id and item["goal_type"] == goal_type and item["status"] == "active":
            goal_table.update_item(
                Key={"user_id": item["user_id"], "goal_id": item["goal_id"]},
                UpdateExpression="SET #s = :val",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":val": "completed"}
            )
            print(f"✅ Goal '{goal_type}' marked as completed.")
            break
def create_goal_if_missing(user_id: str, goal_type: str, reason: str = "User explicitly requested goal"):
    active = get_active_goals(user_id)
    if any(g["goal_type"] == goal_type for g in active):
        return False
    goal_table.put_item(Item={
        "user_id": user_id,
        "goal_id": str(uuid4()),
        "goal_type": goal_type,
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
        "reason": reason
    })
    print(f"🎯 Created goal: {goal_type}")
    return True


async def infer_goal_type_llm(user_input: str) -> str:
    prompt = f"""
You are an intent classifier for a mental health assistant. Based on the user's message, return a short goal type string that describes the purpose of the goal they want to create.

Examples:
- "I want to sleep better" → improve_sleep
- "Help me manage stress" → reduce_stress
- "I need to feel happier" → increase_joy
- "Can you help me journal?" → self_care_journaling

Only return the goal type string.

User: {user_input}
Goal type:
"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://13.203.198.145:8000/query", json={"query": prompt}, timeout=10.0)
            if response.status_code == 200:
                goal_type = response.json().get("answer", "").strip()
                return goal_type if goal_type else "self_care_misc"
    except Exception as e:
        print("LLM intent parser failed:", str(e))
    return "self_care_misc"

# Main chat route
@app.post("/chat")
async def chat(message: Message, request: Request):
    user_input = message.user_input.strip()
    user_id = message.user_id
    print(f"🧠 User Input: {user_input}")

    if "create a goal" in user_input.lower() or "help me" in user_input.lower():
        goal_type = await infer_goal_type_llm(user_input)
        created = create_goal_if_missing(user_id, goal_type, reason=f"User requested goal: {goal_type}")
        if created:
            return {"response": f"🌱 I've created your goal: *{goal_type.replace('_', ' ')}*. Let’s keep growing together."}
        else:
            return {"response": f"🌿 You already have an active goal: *{goal_type.replace('_', ' ')}*. Let me know how it's going!"}


    # Step 1: Check for active goals and respond proactively
    active_goals = get_active_goals(user_id)
    for goal in active_goals:
        goal_type = goal["goal_type"]
        last_check = goal.get("last_triggered", "")
        today = datetime.utcnow().date().isoformat()

        # If not checked today, ask
        if last_check != today:
            goal_table.update_item(
                Key={"user_id": goal["user_id"], "goal_id": goal["goal_id"]},
                UpdateExpression="SET last_triggered = :t",
                ExpressionAttributeValues={":t": today}
            )
            return {"response": f"🌇 Just checking in — did you get a chance to work on your *{goal_type.replace('_', ' ')}* goal today?"}

        # If user affirms, mark as completed
        if is_affirmation(user_input):
            complete_goal(user_id, goal_type)
            return {"response": f"🌈 That’s wonderful to hear! I’ve marked your *{goal_type.replace('_', ' ')}* goal as completed. Keep taking care of yourself."}

    # Step 2: Fallback to AWS RAG
    full_prompt = f"{BASE_PROMPT.strip()}\n\nUser: {user_input}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://15.206.147.152:8000/query", json={"query": full_prompt}, timeout=60.0)
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
