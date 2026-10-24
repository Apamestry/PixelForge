from fastapi.testclient import TestClient
from font_service.main import app

client = TestClient(app)

def test_healthz():
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

def test_list_fonts():
    resp = client.get("/fonts/list")
    assert resp.status_code == 200
    fonts = resp.json()
    assert len(fonts) == 6

    families = [f["family"] for f in fonts]
    assert "Roboto" in families
    assert "Poppins" in families
    assert "Montserrat" in families
    assert "Playfair Display" in families
    assert "Oswald" in families
    assert "Lato" in families

    for f in fonts:
        assert f["weights"] == [400, 700]
        assert "400" in f["files"]
        assert "700" in f["files"]

def test_font_pairings():
    resp = client.get("/fonts/pairings")
    assert resp.status_code == 200
    pairings = resp.json()
    assert len(pairings) >= 3
    for p in pairings:
        assert "heading" in p
        assert "body" in p

def test_get_font_file():
    resp = client.get("/fonts/files/Roboto-400.ttf")
    assert resp.status_code == 200
    assert resp.headers["cache-control"] == "public, max-age=31536000, immutable"
    assert resp.headers["content-type"] == "font/ttf"
    assert len(resp.content) > 1000

def test_path_traversal_rejection():
    # Attempting directory traversal
    resp1 = client.get("/fonts/files/..%2f..%2fetc%2fpasswd")
    assert resp1.status_code in (400, 404)

    resp2 = client.get("/fonts/files/sub/file.ttf")
    assert resp2.status_code in (400, 404)

    resp3 = client.get("/fonts/files/NonExistent-400.ttf")
    assert resp3.status_code == 404
