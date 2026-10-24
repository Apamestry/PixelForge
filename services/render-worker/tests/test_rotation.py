from worker.renderer import compute_rotated_bounds, render_canvas

def test_rotation_math_spec_case():
    """
    SPEC Section 3 & 9 requirement:
    A 100x50 rect at (200,200) rotated 90 occupies x in [150,200], y in [200,300].
    """
    paste_x, paste_y, min_x, min_y, max_x, max_y = compute_rotated_bounds(
        w=100.0,
        h=50.0,
        x=200.0,
        y=200.0,
        angle_degrees=90.0
    )

    assert round(min_x) == 150
    assert round(max_x) == 200
    assert round(min_y) == 200
    assert round(max_y) == 300
    assert round(paste_x) == 150
    assert round(paste_y) == 200

def test_rotation_rendered_pixels():
    """
    Verify actual rendered pixels on canvas:
    100x50 white rect at (200,200) rotated 90 clockwise on a black canvas (400x400).
    Expected: White pixels precisely within x in [150, 199], y in [200, 299].
    """
    canvas_json = {
        "version": 1,
        "width": 400,
        "height": 400,
        "background": "#000000",
        "elements": [
            {
                "id": "rect-1",
                "type": "shape",
                "shape": "rect",
                "x": 200,
                "y": 200,
                "width": 100,
                "height": 50,
                "rotation": 90,
                "opacity": 1.0,
                "fill": "#FFFFFF",
                "strokeWidth": 0
            }
        ]
    }

    img = render_canvas(canvas_json, scale=1)
    pixels = img.load()

    # Inside rotated bounds: must be white
    assert pixels[155, 205][:3] == (255, 255, 255)
    assert pixels[195, 205][:3] == (255, 255, 255)
    assert pixels[155, 295][:3] == (255, 255, 255)
    assert pixels[195, 295][:3] == (255, 255, 255)
    assert pixels[175, 250][:3] == (255, 255, 255)

    # Outside rotated bounds: must be black background
    assert pixels[140, 250][:3] == (0, 0, 0)
    assert pixels[210, 250][:3] == (0, 0, 0)
    assert pixels[175, 190][:3] == (0, 0, 0)
    assert pixels[175, 310][:3] == (0, 0, 0)
