import io
from PIL import Image

def get_auth_token(client, email):
    client.post("/api/auth/register", json={"email": email, "password": "password123"})
    resp = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return resp.json()["access_token"]

def create_test_image_bytes(format="PNG", size=(100, 100), color="red"):
    img = Image.new("RGBA", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

def test_assets_routes(client):
    token = get_auth_token(client, "asset_tester@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Upload valid PNG
    png_data = create_test_image_bytes(format="PNG", size=(150, 150), color="blue")
    files = {"file": ("test.png", png_data, "image/png")}
    up_resp = client.post("/api/assets", files=files, headers=headers)
    assert up_resp.status_code == 201
    asset = up_resp.json()
    assert asset["width"] == 150
    assert asset["height"] == 150
    assert asset["content_type"] == "image/png"
    assert "url" in asset
    assert asset["url"].startswith("/api/files/")

    # Access the uploaded file via signed url
    file_url = asset["url"]
    file_resp = client.get(file_url)
    assert file_resp.status_code == 200
    assert file_resp.headers["content-type"] == "image/png"

    # Upload invalid file (text file disguised as image)
    bad_files = {"file": ("fake.png", b"not an image file at all", "image/png")}
    bad_resp = client.post("/api/assets", files=bad_files, headers=headers)
    assert bad_resp.status_code == 400

    # List assets
    list_resp = client.get("/api/assets", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # Delete asset
    del_resp = client.delete(f"/api/assets/{asset['id']}", headers=headers)
    assert del_resp.status_code == 204

    # File should no longer be accessible
    file_del_resp = client.get(file_url)
    assert file_del_resp.status_code == 404
