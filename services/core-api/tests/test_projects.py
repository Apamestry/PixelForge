def get_auth_token(client, email):
    client.post("/api/auth/register", json={"email": email, "password": "password123"})
    resp = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return resp.json()["access_token"]

def test_project_crud_and_isolation(client):
    token_a = get_auth_token(client, "alice@example.com")
    token_b = get_auth_token(client, "bob@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Alice creates blank project
    create_resp = client.post("/api/projects", json={
        "name": "Alice Banner",
        "width": 1200,
        "height": 630
    }, headers=headers_a)
    assert create_resp.status_code == 201
    proj_a = create_resp.json()
    assert proj_a["name"] == "Alice Banner"
    assert proj_a["canvas"]["width"] == 1200
    assert proj_a["canvas"]["height"] == 630

    # Bob cannot see Alice's project (404)
    bob_get = client.get(f"/api/projects/{proj_a['id']}", headers=headers_b)
    assert bob_get.status_code == 404

    # Alice updates canvas
    valid_canvas = {
        "version": 1,
        "width": 1200,
        "height": 630,
        "background": "#000000",
        "elements": [
            {
                "id": "text-1",
                "type": "text",
                "text": "Hello World",
                "x": 50,
                "y": 50,
                "width": 500,
                "fontFamily": "Roboto",
                "fontSize": 48,
                "fontWeight": 700,
                "fill": "#FFFFFF",
                "align": "left",
                "lineHeight": 1.2
            }
        ]
    }
    update_resp = client.put(f"/api/projects/{proj_a['id']}", json={"canvas": valid_canvas}, headers=headers_a)
    assert update_resp.status_code == 200
    assert len(update_resp.json()["canvas"]["elements"]) == 1

    # Invalid canvas (>4000) rejected with 422
    invalid_canvas = {
        "version": 1,
        "width": 5000,
        "height": 5000,
        "background": "#000000",
        "elements": []
    }
    bad_canvas_resp = client.put(f"/api/projects/{proj_a['id']}", json={"canvas": invalid_canvas}, headers=headers_a)
    assert bad_canvas_resp.status_code == 422

    # Alice deletes project
    del_resp = client.delete(f"/api/projects/{proj_a['id']}", headers=headers_a)
    assert del_resp.status_code == 204

    # Deleted project is now 404
    get_again = client.get(f"/api/projects/{proj_a['id']}", headers=headers_a)
    assert get_again.status_code == 404
