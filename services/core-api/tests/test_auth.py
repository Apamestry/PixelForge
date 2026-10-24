def test_register_and_login(client):
    # Register
    reg_resp = client.post("/api/auth/register", json={
        "email": "user1@example.com",
        "password": "password123"
    })
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()
    assert user_data["email"] == "user1@example.com"
    assert "id" in user_data

    # Duplicate registration rejected
    dup_resp = client.post("/api/auth/register", json={
        "email": "user1@example.com",
        "password": "password123"
    })
    assert dup_resp.status_code == 400

    # Short password rejected (min length 8)
    short_resp = client.post("/api/auth/register", json={
        "email": "user2@example.com",
        "password": "short"
    })
    assert short_resp.status_code == 422

    # Login success
    login_resp = client.post("/api/auth/login", json={
        "email": "user1@example.com",
        "password": "password123"
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # /api/me with token
    me_resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "user1@example.com"

    # /api/me without token
    no_auth_resp = client.get("/api/me")
    assert no_auth_resp.status_code == 401
