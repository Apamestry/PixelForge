import io
import math
import os
from pathlib import Path
from typing import Dict, Any, Optional
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageColor
from sqlalchemy.orm import Session

from worker.models import Asset
from worker.storage import read_file, file_exists
from worker.logger import logger

FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"

def parse_color(color_val: Optional[str]) -> Optional[tuple]:
    if not color_val:
        return None
    try:
        c = ImageColor.getrgb(color_val)
        if len(c) == 3:
            return (c[0], c[1], c[2], 255)
        return c
    except Exception:
        return (0, 0, 0, 255)

def get_font(family: str, weight: int, size: int) -> ImageFont.ImageFont:
    clean_family = (family or "Roboto").replace(" ", "")
    weight_str = str(weight if weight in (400, 700) else 400)

    # 1. Preferred font
    font_path = FONTS_DIR / f"{clean_family}-{weight_str}.ttf"
    if font_path.is_file():
        try:
            return ImageFont.truetype(str(font_path), size=size)
        except Exception as e:
            logger.warning(f"Failed to load font {font_path}: {e}")

    # 2. Fallback to Roboto
    roboto_path = FONTS_DIR / f"Roboto-{weight_str}.ttf"
    if roboto_path.is_file():
        try:
            return ImageFont.truetype(str(roboto_path), size=size)
        except Exception:
            pass

    # 3. Default fallback
    return ImageFont.load_default()

def wrap_text(text: str, font: ImageFont.ImageFont, max_width: int):
    paragraphs = text.split("\n")
    wrapped_lines = []

    for para in paragraphs:
        if not para:
            wrapped_lines.append("")
            continue
        words = para.split(" ")
        current_line = []
        for word in words:
            test_line = " ".join(current_line + [word])
            bbox = font.getbbox(test_line)
            w = bbox[2] - bbox[0]
            if w <= max_width or not current_line:
                current_line.append(word)
            else:
                wrapped_lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            wrapped_lines.append(" ".join(current_line))

    return wrapped_lines

def compute_rotated_bounds(w: float, h: float, x: float, y: float, angle_degrees: float):
    theta = math.radians(angle_degrees)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    corners = [
        (0.0, 0.0),
        (w * cos_t, w * sin_t),
        (-h * sin_t, h * cos_t),
        (w * cos_t - h * sin_t, w * sin_t + h * cos_t),
    ]

    min_u = min(c[0] for c in corners)
    max_u = max(c[0] for c in corners)
    min_v = min(c[1] for c in corners)
    max_v = max(c[1] for c in corners)

    paste_x = x + min_u
    paste_y = y + min_v
    bbox_x1 = paste_x
    bbox_x2 = x + max_u
    bbox_y1 = paste_y
    bbox_y2 = y + max_v

    return paste_x, paste_y, bbox_x1, bbox_y1, bbox_x2, bbox_y2

def render_canvas(canvas_json: Dict[str, Any], scale: int, db: Optional[Session] = None) -> Image.Image:
    cw = max(1, int(round(canvas_json.get("width", 1080) * scale)))
    ch = max(1, int(round(canvas_json.get("height", 1080) * scale)))
    bg_color = parse_color(canvas_json.get("background", "#FFFFFF")) or (255, 255, 255, 255)

    canvas = Image.new("RGBA", (cw, ch), color=bg_color)
    elements = canvas_json.get("elements", [])

    for el in elements:
        el_type = el.get("type")
        x = float(el.get("x", 0)) * scale
        y = float(el.get("y", 0)) * scale
        w = max(1, int(round(float(el.get("width", 1)) * scale)))
        h_val = el.get("height")
        h = max(1, int(round(float(h_val) * scale))) if h_val is not None else None
        opacity = max(0.0, min(1.0, float(el.get("opacity", 1.0))))
        rotation = float(el.get("rotation", 0.0))

        elem_img: Optional[Image.Image] = None

        if el_type == "shape":
            shape_type = el.get("shape", "rect")
            fill = parse_color(el.get("fill"))
            stroke = parse_color(el.get("stroke"))
            stroke_width = int(round(float(el.get("strokeWidth", 0)) * scale))
            corner_radius = int(round(float(el.get("cornerRadius", 0)) * scale))

            elem_h = h if h is not None else w
            elem_img = Image.new("RGBA", (w, elem_h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(elem_img)

            outline_arg = stroke if stroke_width > 0 else None
            sw_arg = stroke_width if stroke_width > 0 else 0

            if shape_type == "rect":
                if corner_radius > 0:
                    draw.rounded_rectangle(
                        [0, 0, w - 1, elem_h - 1],
                        radius=corner_radius,
                        fill=fill,
                        outline=outline_arg,
                        width=sw_arg
                    )
                else:
                    draw.rectangle(
                        [0, 0, w - 1, elem_h - 1],
                        fill=fill,
                        outline=outline_arg,
                        width=sw_arg
                    )
            elif shape_type == "ellipse":
                draw.ellipse(
                    [0, 0, w - 1, elem_h - 1],
                    fill=fill,
                    outline=outline_arg,
                    width=sw_arg
                )

        elif el_type == "text":
            text = str(el.get("text", ""))
            family = el.get("fontFamily", "Roboto")
            weight = int(el.get("fontWeight", 400))
            font_size = max(1, int(round(float(el.get("fontSize", 24)) * scale)))
            fill = parse_color(el.get("fill", "#000000")) or (0, 0, 0, 255)
            align = el.get("align", "left")
            line_height_mult = float(el.get("lineHeight", 1.2))

            font = get_font(family, weight, font_size)
            lines = wrap_text(text, font, w)
            line_height_px = max(1, int(round(font_size * line_height_mult)))
            total_h = max(line_height_px, len(lines) * line_height_px)

            elem_img = Image.new("RGBA", (w, total_h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(elem_img)

            for idx, line in enumerate(lines):
                if not line:
                    continue
                bbox = font.getbbox(line)
                lw = bbox[2] - bbox[0]
                if align == "center":
                    lx = max(0, int((w - lw) / 2))
                elif align == "right":
                    lx = max(0, w - lw)
                else:
                    lx = 0
                ly = idx * line_height_px
                draw.text((lx, ly), line, fill=fill, font=font)

        elif el_type == "image":
            elem_h = h if h is not None else w
            asset_id = el.get("assetId")
            storage_key = None

            if db and asset_id:
                asset_record = db.query(Asset).filter(Asset.id == asset_id).first()
                if asset_record:
                    storage_key = asset_record.storage_key

            img_bytes = None
            if storage_key and file_exists(storage_key):
                try:
                    img_bytes = read_file(storage_key)
                except Exception as e:
                    logger.warning(f"Error reading asset file {storage_key}: {e}")

            if img_bytes:
                try:
                    raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
                    elem_img = raw_img.resize((w, elem_h), Image.Resampling.LANCZOS)

                    filters = el.get("filters") or {}
                    b_val = float(filters.get("brightness", 0.0))
                    if b_val != 0.0:
                        elem_img = ImageEnhance.Brightness(elem_img).enhance(1.0 + b_val)
                    c_val = float(filters.get("contrast", 0.0))
                    if c_val != 0.0:
                        elem_img = ImageEnhance.Contrast(elem_img).enhance(1.0 + c_val)
                    s_val = float(filters.get("saturation", 0.0))
                    if s_val != 0.0:
                        elem_img = ImageEnhance.Color(elem_img).enhance(1.0 + s_val)
                    if filters.get("grayscale"):
                        alpha = elem_img.split()[3]
                        gray = elem_img.convert("L").convert("RGBA")
                        gray.putalpha(alpha)
                        elem_img = gray
                except Exception as e:
                    logger.warning(f"Error processing image {asset_id}: {e}")
                    elem_img = None

            if elem_img is None:
                # Render gray placeholder per SPEC Section 6
                elem_img = Image.new("RGBA", (w, elem_h), color=(200, 200, 200, 255))
                draw = ImageDraw.Draw(elem_img)
                ph_font = get_font("Roboto", 400, max(12, int(16 * scale)))
                draw.text((10, 10), "Missing asset", fill=(100, 100, 100, 255), font=ph_font)

        if elem_img is None:
            continue

        # Opacity
        if opacity < 1.0:
            r, g, b, a = elem_img.split()
            a = a.point(lambda p: int(round(p * opacity)))
            elem_img.putalpha(a)

        # Rotation about element's top-left (x, y)
        if rotation != 0.0:
            pw, ph = elem_img.size
            paste_x, paste_y, _, _, _, _ = compute_rotated_bounds(pw, ph, x, y, rotation)
            # PIL rotate is counter-clockwise, so pass -rotation for clockwise
            rotated = elem_img.rotate(-rotation, expand=True, resample=Image.Resampling.BICUBIC)
            canvas.paste(rotated, (int(round(paste_x)), int(round(paste_y))), rotated)
        else:
            canvas.paste(elem_img, (int(round(x)), int(round(y))), elem_img)

    return canvas

def export_image(canvas: Image.Image, format_str: str, background_hex: str = "#FFFFFF") -> bytes:
    fmt = format_str.lower()
    buf = io.BytesIO()

    if fmt == "png":
        canvas.save(buf, format="PNG")
    elif fmt == "jpeg" or fmt == "jpg":
        bg_rgb = parse_color(background_hex) or (255, 255, 255, 255)
        flattened = Image.new("RGB", canvas.size, (bg_rgb[0], bg_rgb[1], bg_rgb[2]))
        flattened.paste(canvas, (0, 0), canvas)
        flattened.save(buf, format="JPEG", quality=90)
    elif fmt == "pdf":
        bg_rgb = parse_color(background_hex) or (255, 255, 255, 255)
        flattened = Image.new("RGB", canvas.size, (bg_rgb[0], bg_rgb[1], bg_rgb[2]))
        flattened.paste(canvas, (0, 0), canvas)
        flattened.save(buf, format="PDF")
    else:
        raise ValueError(f"Unsupported format: {format_str}")

    return buf.getvalue()
