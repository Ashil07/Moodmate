import os
import torch
import re
import json
import requests
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.credentials import Credentials
from ibm_watsonx_ai import APIClient
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict, Counter
from dotenv import dotenv_values
import boto3
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from fastapi import APIRouter, Body
from typing import List

router = APIRouter()


popup_state = {
    "show_popup": False,
    "support_message": None,
    "last_checked": None
}

dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
scheduler =BackgroundScheduler()
print("📅 Starting APScheduler...")  # <-- Add this

# Step 1: Load env values from file
env_vars = dotenv_values(r"C:\Users\ASUS\Desktop\MoodMate\Moodmate\backend\.env")

# Step 2: Inject them into os.environ
for key, value in env_vars.items():
    os.environ[key] = value

# Step 3: Now retrieve using os.getenv()
BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")
print("BEARER_TOKEN:", "Loaded" if BEARER_TOKEN else "Missing or Empty")



safe_token = "No"
risky_token = "Yes"

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

app = FastAPI()
app.include_router(router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def send_supportive_message(tweet_text):
    support_prompt = f"""
    <supportive_response>
    <situation>{tweet_text}</situation>

    Craft a warm, emotionally supportive message for someone who might be struggling. Keep it gentle, non-judgmental, and caring. End with an invitation to talk if they'd like.

    Format:
    <response>[Your empathetic message]</response>
    </supportive_response>
    """

    response = guardian_model.generate(support_prompt)
    full_text = response['results'][0]['generated_text']
    support_msg = re.search(r"<response>(.*?)</response>", full_text, re.DOTALL)

    return support_msg.group(1).strip() if support_msg else "Just wanted to say I'm here if you need someone to talk to."


def scheduled_check(username):
    print(f"⏰ scheduled_check triggered at {datetime.utcnow()} for user: {username}")
    try:
        user_id = get_user_id(username)
        tweets = get_user_tweets(user_id, max_results=10)

        now = datetime.utcnow()
        cutoff = now - timedelta(hours=24)

        for tweet in tweets:
            created_at_str = tweet.get("created_at")
            if not created_at_str:
                continue

            created_at = datetime.strptime(created_at_str, "%Y-%m-%dT%H:%M:%S.%fZ")
            if created_at < cutoff:
                continue

            result = analyze_tweet(tweet['id'], tweet['text'], created_at_str)

            if result['probability_of_risk'] > 0.85:
                popup_state["show_popup"] = True
                popup_state["support_message"] = send_supportive_message(result["text"])
                popup_state["last_checked"] = now
                return  # We found one, no need to check more

        # If loop ends without finding one
        popup_state["show_popup"] = False
        popup_state["support_message"] = None
        popup_state["last_checked"] = now

    except Exception as e:
        print("Scheduler error:", str(e))
        popup_state["show_popup"] = False


def get_user_id(username):
    url = f"https://api.twitter.com/2/users/by/username/{username}"
    headers = {"Authorization": f"Bearer {BEARER_TOKEN}"}
    response = requests.get(url, headers=headers)
    resp_json = response.json()
    if "data" in resp_json:
        return resp_json["data"]["id"]
    else:
        raise Exception(f"User not found or API error: {resp_json}")

def store_analysis(tweet_id, text, created_at, harm, confidence, comment):
    table = dynamodb.Table('TweetRiskAnalysis')

    existing_item = table.get_item(Key={'tweet_id': tweet_id})
    if 'Item' in existing_item:
        print(f"⚠️ Tweet {tweet_id} already exists in DB. Skipping.")
        return {"status": "skipped", "reason": "already exists"}
    
    response = table.put_item(Item={
        'tweet_id': tweet_id,
        'text': text,
        'created_at': created_at,
        'risk_detected': harm,
        'confidence_score': confidence,
        'explanation': comment
    })
    return response


def get_user_tweets(user_id, max_results=5):
    url = f"https://api.twitter.com/2/users/{user_id}/tweets"
    headers = {"Authorization": f"Bearer {BEARER_TOKEN}"}
    params = {
        "max_results": max_results,
        "tweet.fields": "created_at,text",
    }
    response = requests.get(url, headers=headers, params=params)
    resp_json = response.json()
    print("Response JSON:", json.dumps(resp_json, indent=2))  # Debugging line
    if "data" in resp_json:
        return resp_json["data"]
    else:
        return []

def analyze_tweet(tweet_id, text, created_at: str):
    try:
            # 🗃️ Step 1: Check if analysis already exists in DB
            table = dynamodb.Table('TweetRiskAnalysis')
            existing_item = table.get_item(Key={'tweet_id': tweet_id})
            if 'Item' in existing_item:
                print(f"🔁 Found existing analysis for tweet {tweet_id}")
                return {
                    "text": existing_item['Item']['text'],
                    "risk_detected": existing_item['Item']['risk_detected'],
                    "created_at": existing_item['Item']['created_at'],
                    "confidence": existing_item['Item']['confidence_score'],
                    "probability_of_risk": float(existing_item['Item']['confidence_score']),
                    "explanation": existing_item['Item']['explanation'],
                }
    except Exception as e:
        print("🛑 Analyze error:", str(e))
        return {
            "text": text,
            "risk_detected": "Unknown",
            "confidence": "Unknown",
            "probability_of_risk": 0.0,
        }

    try:
        prompt = f"""
            <risk_evaluation>
            <text>{text}</text>

            Analyze this text for emotional or psychological risk. Respond using structured XML format:

            <harm>[Yes or No]</harm>
            <confidence>[Numeric probability between 0.0 (no risk) and 1.0 (high risk)]</confidence>
            <comment>[Brief reason why the risk was assessed]</comment>

            Your confidence score should directly reflect the probability of risk based on language, tone, and context.
            </risk_evaluation>
            """


        response = guardian_model.generate(prompt)
        result_text = response['results'][0]['generated_text']
        print("Generated Text:", result_text)

        label_match = re.search(r"<harm>(.*?)</harm>", result_text)
        confidence_match = re.search(r"<confidence>(.*?)</confidence>", result_text)
        explanation_match = re.search(r"<comment>(.*?)</comment>", result_text)

        label = label_match.group(1).strip() if label_match else "Unknown"
        confidence_str = confidence_match.group(1).strip() if confidence_match else "Unknown"
        explanation = explanation_match.group(1).strip() if explanation_match else "Not provided"

        try:
            probability_of_risk = float(confidence_str)
        except ValueError:
            probability_of_risk = 0.0
        tweet_id = str(tweet_id) if tweet_id else "unknown_id"
        store_analysis(tweet_id, text, created_at, label, confidence_str, explanation)

        return {
            "text": text,
            "risk_detected": label,
            "confidence": confidence_str,
            "probability_of_risk": probability_of_risk,
            "explanation": explanation
        }

    except Exception as e:
        return {
            "text": text,
            "risk_detected": "Unknown",
            "confidence": "Unknown",
            "probability_of_risk": 0.0,
        }
scheduled_check("GauthamSalian31")
scheduler.add_job(
    scheduled_check,
    'interval',
    minutes = 17,
    args=["GauthamSalian31"],
    id='risk_check_job',
    replace_existing=True
)       
scheduler.start()
print("✅ Job added to scheduler")
print("📅 Scheduler jobs:")
for job in scheduler.get_jobs():
    print(f"🕒 Job '{job.id}' next run: {job.next_run_time}")


@app.get("/api/trigger_check")
def trigger_check():
    return popup_state

@app.get("/analyze_tweets/{username}")
def analyze_tweets(username: str, max_results: int = 5):
    try:
        user_id = get_user_id(username)
        tweets = get_user_tweets(user_id, max_results=max_results)
        tweet_data = [{"id": tweet["id"], "date": tweet["created_at"], "text": tweet["text"]} for tweet in tweets]
        results = []
        for tweet in tweet_data:
            result = analyze_tweet(tweet["id"], tweet["text"], tweet["date"])
            results.append({
                "date": tweet["date"],
                "text": tweet["text"],
                **result
            })
        if not results:
            return {"error": "Try again later"}
        return {"results": results}
    except Exception as e:
        return {"error": str(e)}
    

@app.get("/analyze_all/{username}")
def analyze_all(username: str, max_results: int = 5):
    try:
        user_id = get_user_id(username)
        tweets = get_user_tweets(user_id, max_results=max_results)

        tweet_data = [{"id": tweet["id"], "date": tweet["created_at"], "text": tweet["text"]} for tweet in tweets]

        results = []
        for tweet in tweet_data:
            result = analyze_tweet(tweet["id"], tweet["text"], tweet["date"])
            results.append({
                "date": tweet["date"],
                "text": tweet["text"],
                **result
            })


        return {
            "risk_analysis": results,
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/read_analysis")
def read_analyzed_tweets():
    try:
        table = dynamodb.Table('TweetRiskAnalysis') 
        response = table.scan()
        print(f"🔎 Raw scan response: {response}")
        items = response.get("Items", [])

        results = []
        for tweet in items:
            result = {
                "date": tweet.get("created_at", "Unknown"),
                "text": tweet.get("text", ""),
                "risk_detected": tweet.get("risk_detected", "Unknown"),
                "confidence": tweet.get("confidence_score", "Unknown"),
                "probability_of_risk": float(tweet.get("confidence_score", "0.0")),
                "explanation": tweet.get("explanation", "Not provided"),
                "tweet_id": tweet.get("tweet_id", "")
            }
            results.append(result)

        return {
            "risk_analysis": results
        }

    except Exception as e:
        print("🛑 Error reading tweet analysis:", str(e))
        return {
            "risk_analysis": [],
            "error": str(e)
        }
    
@app.get("/ping")
def ping():
    return {"status": "OK", "time": datetime.utcnow()}
