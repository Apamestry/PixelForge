def test_templates_routes(client):
    # Register and login to get auth token
    reg = client.post("/api/auth/register", json={"email": "tpl_test@example.com", "password": "password123"})
    login = client.post("/api/auth/login", json={"email": "tpl_test@example.com", "password": "password123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List templates
    resp = client.get("/api/templates", headers=headers)
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) == 5

    names = [t["name"] for t in templates]
    assert "Instagram Post" in names
    assert "Event Poster" in names
    assert "YouTube Thumbnail" in names
    assert "LinkedIn Banner" in names
    assert "Infographic" in names

    # Get single template
    t0_id = templates[0]["id"]
    get_resp = client.get(f"/api/templates/{t0_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == templates[0]["name"]

    # Non-existent template -> 404
    bad_resp = client.get("/api/templates/non-existent-id", headers=headers)
    assert bad_resp.status_code == 404
