from worker.renderer import render_canvas, export_image

def test_render_shapes_and_text():
    canvas_json = {
        "version": 1,
        "width": 800,
        "height": 600,
        "background": "#FFFFFF",
        "elements": [
            {
                "id": "bg-shape",
                "type": "shape",
                "shape": "rect",
                "x": 50,
                "y": 50,
                "width": 700,
                "height": 500,
                "rotation": 0,
                "opacity": 0.5,
                "fill": "#3B82F6",
                "stroke": "#1D4ED8",
                "strokeWidth": 2,
                "cornerRadius": 16
            },
            {
                "id": "circle-1",
                "type": "shape",
                "shape": "ellipse",
                "x": 100,
                "y": 100,
                "width": 150,
                "height": 150,
                "rotation": 0,
                "opacity": 1.0,
                "fill": "#EF4444",
                "strokeWidth": 0
            },
            {
                "id": "title-text",
                "type": "text",
                "text": "PixelForge Render Engine",
                "x": 100,
                "y": 300,
                "width": 600,
                "rotation": 0,
                "opacity": 1.0,
                "fontFamily": "Poppins",
                "fontSize": 36,
                "fontWeight": 700,
                "fill": "#FFFFFF",
                "align": "left",
                "lineHeight": 1.2
            }
        ]
    }

    # Render at 1x
    img1 = render_canvas(canvas_json, scale=1)
    assert img1.size == (800, 600)

    # Render at 2x
    img2 = render_canvas(canvas_json, scale=2)
    assert img2.size == (1600, 1200)

    # Test PNG export
    png_bytes = export_image(img1, "png")
    assert len(png_bytes) > 0
    assert png_bytes[:4] == b"\x89PNG"

    # Test JPEG export
    jpg_bytes = export_image(img1, "jpeg", background_hex="#FFFFFF")
    assert len(jpg_bytes) > 0
    assert jpg_bytes[:2] == b"\xff\xd8"

    # Test PDF export
    pdf_bytes = export_image(img1, "pdf", background_hex="#FFFFFF")
    assert len(pdf_bytes) > 0
    assert pdf_bytes[:4] == b"%PDF"

def test_missing_asset_placeholder():
    canvas_json = {
        "version": 1,
        "width": 400,
        "height": 400,
        "background": "#FFFFFF",
        "elements": [
            {
                "id": "missing-img",
                "type": "image",
                "assetId": "non-existent-asset-id",
                "x": 50,
                "y": 50,
                "width": 200,
                "height": 200,
                "rotation": 0,
                "opacity": 1.0
            }
        ]
    }
    img = render_canvas(canvas_json, scale=1)
    assert img.size == (400, 400)
    # The area (100, 100) should have the gray placeholder
    pixels = img.load()
    assert pixels[100, 100][:3] == (200, 200, 200)
