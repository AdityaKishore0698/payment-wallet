import requests
import os
os.environ["NO_PROXY"] = "*"

API_URL = "http://127.0.0.1:8000"
proxies = {"http": None, "https": None}

print("Registering...")
res = requests.post(f"{API_URL}/users/", json={"email": "testdel2@test.com", "password": "pass", "first_name": "Test", "last_name": "Del"}, proxies=proxies)
print(res.status_code, res.text)
    
print("Logging in...")
res = requests.post(f"{API_URL}/auth/login", data={"username": "testdel2@test.com", "password": "pass"}, proxies=proxies)
print(res.status_code, res.text)
if res.status_code == 200:
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Changing password...")
    res2 = requests.post(f"{API_URL}/auth/change-password", json={"old_password": "pass", "new_password": "newpass"}, headers=headers, proxies=proxies)
    print(res2.status_code, res2.text)
    
    print("Deleting account...")
    res3 = requests.delete(f"{API_URL}/users/me", headers=headers, proxies=proxies)
    print(res3.status_code, res3.text)
    
print("Recover password...")
res4 = requests.post(f"{API_URL}/auth/recover", json={"email": "testdel2@test.com"}, proxies=proxies)
print(res4.status_code, res4.text)

