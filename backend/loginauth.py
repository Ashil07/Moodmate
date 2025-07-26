import bcrypt
import boto3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from botocore.exceptions import ClientError

app = FastAPI()

# ✅ Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to your frontend domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('UserAuth')

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@app.post("/login")
def login(payload: LoginRequest):
    try:
        response = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("email").eq(payload.email)
        )
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="User not found")

        user = items[0]
        if bcrypt.checkpw(payload.password.encode(), user["hashed_pw"].encode()):
            return {"message": "Login successful", "username": user["username"]}
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB error: {e.response['Error']['Message']}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
