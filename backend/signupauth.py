import json, uuid, boto3, bcrypt
from botocore.exceptions import ClientError
from datetime import datetime
import bcrypt


dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('UserAuth')

def generate_uuid() -> str:
    """Generate a unique UUIDv4 string."""
    return str(uuid.uuid4())

def hash_password(password: str) -> str:
    """Securely hash a password using bcrypt with automatic salting."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode('utf-8')


def lambda_handler(event, context):
    body = json.loads(event['body'])
    email = body['email']
    password = body['password']
    consent = body['consent']

    if not consent:
        return {
            'statusCode': 400,
            'headers': {...},
            'body': json.dumps({'message': 'Consent required'})
        }

    user_id = generate_uuid()
    hashed_pw = hash_password(password)

    if save_user(email, user_id, hashed_pw, consent):
        return {
            'statusCode': 201,
            'headers': {...},
            'body': json.dumps({'message': 'Signup successful', 'id': user_id})
        }
    else:
        return {
            'statusCode': 500,
            'headers': {...},
            'body': json.dumps({'message': 'Internal Server Error'})
        }

def save_user(email, user_id, hashed_pw, consent):
    try:
        table.put_item(Item={
        'username': user_id,
        'email': email,
        'hashed_pw': hashed_pw,  # ✅ Use hashed_pw here
        'consent': consent,      # ✅ Add consent field
        'created_at': datetime.utcnow().isoformat()
    })
        return True
    except ClientError as e:
        print("❌ DynamoDB error:", e.response['Error']['Message'])
        return False


if __name__ == "__main__":
    test_event = {
        "body": json.dumps({
            "email": "test@example.com",
            "password": "MySecurePass123!",
            "consent": True
        })
    }
    print(lambda_handler(test_event, None))
