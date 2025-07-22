import boto3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import requests
from fastapi.middleware.cors import CORSMiddleware
from ibm_watsonx_ai.credentials import Credentials
from ibm_watsonx_ai import APIClient
from ibm_watsonx_ai.foundation_models import ModelInference
from boto3.dynamodb.conditions import Key
from uuid import uuid4
from datetime import datetime
from decimal import Decimal
from uuid import UUID

class HabitProgressInput(BaseModel):
    user_id: str
    habit_name: str
    replacement_habit: str
    streak: int
    level: int
    last_completed: str  # "YYYY-MM-DD"

class StreakUpdateInput(BaseModel):
    user_id: str
    habit_id: str


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 👈 match your frontend port!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")  # change region if needed
table = dynamodb.Table("HabitFlowProgress")  # make sure this exists


load_dotenv()



API_KEY = os.getenv("WATSONX_API_KEY")
credentials = Credentials(
    url="https://eu-de.ml.cloud.ibm.com",  # or regional Watsonx URL
    api_key=os.getenv("WATSONX_API_KEY")
)
client = APIClient(credentials)

guardian_model = ModelInference(
    model_id="ibm/granite-3-3-8b-instruct",  # ⚠️ A supported model with long-term viability
    credentials=credentials,
    project_id="1cb8c38f-d650-41fe-9836-86659006c090",
    params={"decoding_method": "greedy", "max_new_tokens": 100}
)

class HabitInput(BaseModel):
    bad_habit: str

@app.post("/suggest_replacements")
def suggest_replacements(data: HabitInput):
    try:
        prompt = (
            f"Suggest 3 healthy replacement habits for the bad habit: \"{data.bad_habit}\".\n"
            "Make each suggestion concise (max 5 words) and list them as bullet points."
        )

        response = guardian_model.generate(prompt)
        raw = response["results"][0]["generated_text"]

        suggestions = [line.strip("-•* ").strip() for line in raw.split("\n") if line.strip()]
        return {"suggestions": suggestions[:3]}
    except Exception as e:
        print("🧨 Granite LLM Error:", str(e))
        return {"suggestions": ["Take a short walk", "Drink water", "Stretch mindfully"]}

@app.post("/habitflow/save-progress")
def save_progress(data: HabitProgressInput):
    habit_id = str(uuid4())
    table.put_item(Item={
        "user_id": data.user_id,
        "habit_id": habit_id,
        "habit_name": data.habit_name,
        "replacement_habit": data.replacement_habit,
        "streak_days": Decimal(str(data.streak)),
        "level": Decimal(str(data.level)),
        "started_on": datetime.now().date().isoformat(),
        "last_completed": data.last_completed,
        "is_active": True
    })
    return {"message": "✅ Habit progress saved separately!"}

@app.get("/habitflow/get-progress")
def get_habit_progress(user_id: str = None):
    try:
        if user_id:
            response = table.query(
                KeyConditionExpression=Key("user_id").eq(user_id)
            )
        else:
            response = table.scan()

        items = response.get("Items", [])
        return {"habits": items}
    except Exception as e:
        return {"error": str(e), "habits": []}
    

@app.post("/habitflow/increment-streak")
def increment_streak(data: StreakUpdateInput):
    try:
        response = table.get_item(Key={"user_id": data.user_id, "habit_id": data.habit_id})
        item = response.get("Item")
        if not item:
            return {"error": "Habit not found"}

        new_streak = item.get("streak_days", 0) + 1
        new_level = item.get("level", 0)
        if new_streak % 5 == 0:
            new_level += 1

        table.update_item(
            Key={"user_id": data.user_id, "habit_id": data.habit_id},
            UpdateExpression="SET streak_days = :sd, last_completed = :lc, #lvl = :lv",
            ExpressionAttributeNames={"#lvl": "level"},
            ExpressionAttributeValues={
                ":sd": Decimal(str(new_streak)),
                ":lc": datetime.now().date().isoformat(),
                ":lv": Decimal(str(new_level))
            }
        )
        return {"message": "✅ Day added, streak updated!"}
    except Exception as e:
        print("❌ Increment streak error:", str(e))
        return {"error": str(e)}
