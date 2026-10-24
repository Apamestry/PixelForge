def get_auth_token(client, email):
    client.post("/api/auth/register", json={"email": email, "password": "password123"})
    resp = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return resp.json()["access_token"]

def test_export_flow(client):
    token = get_auth_token(client, "export_tester@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create project
    proj_resp = client.post("/api/projects", json={
        "name": "Export Project",
        "width": 800,
        "height": 600
    }, headers=headers)
    proj_id = proj_resp.json()["id"]

    # Queue export
    exp_resp = client.post("/api/exports", json={
        "projectId": proj_id,
        "format": "png",
        "scale": 1
    }, headers=headers)
    assert exp_resp.status_code == 202
    exp_data = exp_resp.json()
    assert exp_data["status"] == "queued"
    assert exp_data["format"] == "png"
    job_id = exp_data["id"]

    # Get export status
    get_exp = client.get(f"/api/exports/{job_id}", headers=headers)
    assert get_exp.status_code == 200
    assert get_exp.json()["id"] == job_id
    assert get_exp.json()["status"] == "queued"

    # List exports
    list_exp = client.get("/api/exports", headers=headers)
    assert list_exp.status_code == 200
    assert len(list_exp.json()) >= 1
