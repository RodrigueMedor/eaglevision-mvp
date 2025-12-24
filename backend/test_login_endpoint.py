import requests
import json

url = "http://localhost:8000/api/auth/login-json"
headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}
data = {
    "username": "admin@eaglevision.com",
    "password": "Admin@123"
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print("Response Headers:")
    for header, value in response.headers.items():
        print(f"  {header}: {value}")
    
    print("\nResponse Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
        
except Exception as e:
    print(f"Error making request: {str(e)}")
