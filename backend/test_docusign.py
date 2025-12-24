import requests
import json

# Test data
test_data = {
    "signer": {
        "email": "test@example.com",
        "name": "Test User",
        "client_user_id": "12345"
    },
    "return_url": "http://localhost:3000/signed"
}

print("Sending test request to DocuSign endpoint...")

# Make the request
try:
    response = requests.post(
        "http://localhost:8000/api/docusign/envelope",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\nStatus Code: {response.status_code}")
    print("Response:")
    print(json.dumps(response.json(), indent=2))
    
except requests.exceptions.ConnectionError:
    print("\nError: Could not connect to the server. Make sure the FastAPI server is running.")
    print("You can start it with: uvicorn main:app --reload")
except Exception as e:
    print(f"\nError: {str(e)}")
