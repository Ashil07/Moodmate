import uuid
import bcrypt
import boto3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from botocore.exceptions import ClientError
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('UserAuth')

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    consent: bool

def generate_uuid() -> str:
    return str(uuid.uuid4())

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode('utf-8')

def save_user(email: str, user_id: str, hashed_pw: str, consent: bool) -> bool:
    try:
        table.put_item(Item={
            'username': user_id,
            'email': email,
            'hashed_pw': hashed_pw,
            'consent': consent,
            'created_at': datetime.utcnow().isoformat()
        })
        return True
    except ClientError as e:
        print("❌ DynamoDB error:", e.response['Error']['Message'])
        return False

@app.post("/signup")
def signup(payload: SignupRequest):
    if not payload.consent:
        raise HTTPException(status_code=400, detail="Consent required")

    user_id = generate_uuid()
    hashed_pw = hash_password(payload.password)

    success = save_user(payload.email, user_id, hashed_pw, payload.consent)
    if success:
        return {"message": "Signup successful", "id": user_id}
    else:
        raise HTTPException(status_code=500, detail="Internal Server Error")
