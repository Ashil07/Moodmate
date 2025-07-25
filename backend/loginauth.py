import json, uuid, boto3, bcrypt

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('UserAuth')

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    try:
        body = json.loads(event["body"])
        email = body["email"]
        password = body["password"]

        # 1. Query user by email
        response = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("email").eq(email)
        )
        items = response.get("Items", [])
        if not items:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "User not found"})}

        user = items[0]
        stored_hash = user["hashed_pw"]

        # 2. Compare passwords
        if bcrypt.checkpw(password.encode(), stored_hash.encode()):
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"message": "Login successful", "username": user["username"]})
            }
        else:
            return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Invalid credentials"})}

    except Exception as e:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}

if __name__ == "__main__":
    test_event = {
        "body": json.dumps({
            "email": "test@example.com",
            "password": "MySecurePass123!"
        })
    }
    print(lambda_handler(test_event, None))
