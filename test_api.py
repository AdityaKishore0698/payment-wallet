import requests

API_URL = "http://localhost:8000"
print("Registering...")
res = requests.post(f"{API_URL}/users/", json={"email": "testdel@test.com", "password": "pass", "first_name": "Test", "last_name": "Del"})
if res.status_code == 400:
    print("User already exists")
    
print("Logging in...")
res = requests.post(f"{API_URL}/auth/login", data={"username": "testdel@test.com", "password": "pass"})
print(res.status_code, res.text)
if res.status_code == 200:
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Changing password...")
    res2 = requests.post(f"{API_URL}/auth/change-password", json={"old_password": "pass", "new_password": "newpass"}, headers=headers)
    print(res2.status_code, res2.text)
    
    print("Deleting account...")
    res3 = requests.delete(f"{API_URL}/users/me", headers=headers)
    print(res3.status_code, res3.text)
    
print("Recover password...")
res4 = requests.post(f"{API_URL}/auth/recover", json={"email": "testdel@test.com"})
print(res4.status_code, res4.text)

