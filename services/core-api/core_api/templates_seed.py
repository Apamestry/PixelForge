import uuid
from sqlalchemy.orm import Session
from core_api.models import Template
from core_api.logger import logger

SEED_TEMPLATES = [
    {
        "name": "Instagram Post",
        "width": 1080,
        "height": 1080,
        "canvas": {
            "version": 1,
            "width": 1080,
            "height": 1080,
            "background": "#1E1E2F",
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "rect",
                    "x": 80,
                    "y": 80,
                    "width": 920,
                    "height": 920,
                    "rotation": 0,
                    "opacity": 0.15,
                    "fill": "#6366F1",
                    "stroke": "#818CF8",
                    "strokeWidth": 4,
                    "cornerRadius": 32
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "ellipse",
                    "x": 750,
                    "y": 180,
                    "width": 180,
                    "height": 180,
                    "rotation": 0,
                    "opacity": 0.3,
                    "fill": "#EC4899",
                    "stroke": "#000000",
                    "strokeWidth": 0,
                    "cornerRadius": 0
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "CREATIVE VIBES",
                    "x": 140,
                    "y": 420,
                    "width": 800,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fontFamily": "Montserrat",
                    "fontSize": 72,
                    "fontWeight": 700,
                    "fill": "#FFFFFF",
                    "align": "left",
                    "lineHeight": 1.2
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "Design without limits. Crafted for modern creators.",
                    "x": 140,
                    "y": 560,
                    "width": 780,
                    "rotation": 0,
                    "opacity": 0.85,
                    "fontFamily": "Poppins",
                    "fontSize": 32,
                    "fontWeight": 400,
                    "fill": "#E0E7FF",
                    "align": "left",
                    "lineHeight": 1.4
                }
            ]
        }
    },
    {
        "name": "Event Poster",
        "width": 1080,
        "height": 1350,
        "canvas": {
            "version": 1,
            "width": 1080,
            "height": 1350,
            "background": "#0F172A",
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "rect",
                    "x": 60,
                    "y": 60,
                    "width": 960,
                    "height": 1230,
                    "rotation": 0,
                    "opacity": 0.1,
                    "fill": "#0284C7",
                    "stroke": "#38BDF8",
                    "strokeWidth": 2,
                    "cornerRadius": 20
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "rect",
                    "x": 100,
                    "y": 250,
                    "width": 880,
                    "height": 8,
                    "rotation": 0,
                    "opacity": 0.8,
                    "fill": "#38BDF8",
                    "stroke": "#000000",
                    "strokeWidth": 0,
                    "cornerRadius": 4
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "GLOBAL TECH SUMMIT",
                    "x": 100,
                    "y": 140,
                    "width": 880,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fontFamily": "Poppins",
                    "fontSize": 64,
                    "fontWeight": 700,
                    "fill": "#F8FAFC",
                    "align": "left",
                    "lineHeight": 1.2
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "Innovations in Cloud Native Engineering and Design Systems",
                    "x": 100,
                    "y": 320,
                    "width": 850,
                    "rotation": 0,
                    "opacity": 0.9,
                    "fontFamily": "Roboto",
                    "fontSize": 36,
                    "fontWeight": 400,
                    "fill": "#94A3B8",
                    "align": "left",
                    "lineHeight": 1.4
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "rect",
                    "x": 100,
                    "y": 1100,
                    "width": 320,
                    "height": 90,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fill": "#0284C7",
                    "stroke": "#000000",
                    "strokeWidth": 0,
                    "cornerRadius": 16
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "REGISTER NOW",
                    "x": 140,
                    "y": 1130,
                    "width": 240,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fontFamily": "Poppins",
                    "fontSize": 28,
                    "fontWeight": 700,
                    "fill": "#FFFFFF",
                    "align": "center",
                    "lineHeight": 1.2
                }
            ]
        }
    },
    {
        "name": "YouTube Thumbnail",
        "width": 1280,
        "height": 720,
        "canvas": {
            "version": 1,
            "width": 1280,
            "height": 720,
            "background": "#18181B",
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "rect",
                    "x": 80,
                    "y": 120,
                    "width": 640,
                    "height": 480,
                    "rotation": 0,
                    "opacity": 0.25,
                    "fill": "#EF4444",
                    "stroke": "#EF4444",
                    "strokeWidth": 4,
                    "cornerRadius": 24
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "ellipse",
                    "x": 880,
                    "y": 180,
                    "width": 320,
                    "height": 320,
                    "rotation": 0,
                    "opacity": 0.2,
                    "fill": "#F59E0B",
                    "stroke": "#000000",
                    "strokeWidth": 0,
                    "cornerRadius": 0
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "10X FASTER",
                    "x": 120,
                    "y": 180,
                    "width": 580,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fontFamily": "Oswald",
                    "fontSize": 84,
                    "fontWeight": 700,
                    "fill": "#EF4444",
                    "align": "left",
                    "lineHeight": 1.1
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "MASTER PIXELFORGE TODAY",
                    "x": 120,
                    "y": 320,
                    "width": 600,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fontFamily": "Oswald",
                    "fontSize": 56,
                    "fontWeight": 700,
                    "fill": "#FFFFFF",
                    "align": "left",
                    "lineHeight": 1.2
                }
            ]
        }
    },
    {
        "name": "LinkedIn Banner",
        "width": 1584,
        "height": 396,
        "canvas": {
            "version": 1,
            "width": 1584,
            "height": 396,
            "background": "#0A2540",
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "ellipse",
                    "x": 1200,
                    "y": -80,
                    "width": 500,
                    "height": 500,
                    "rotation": 0,
                    "opacity": 0.15,
                    "fill": "#60A5FA",
                    "stroke": "#000000",
                    "strokeWidth": 0,
                    "cornerRadius": 0
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "TRANSFORMING DIGITAL PRODUCTS",
                    "x": 120,
                    "y": 110,
                    "width": 1100,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fontFamily": "Montserrat",
                    "fontSize": 48,
                    "fontWeight": 700,
                    "fill": "#FFFFFF",
                    "align": "left",
                    "lineHeight": 1.2
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "Scalable Cloud Architecture • High-Performance Rendering",
                    "x": 120,
                    "y": 200,
                    "width": 1000,
                    "rotation": 0,
                    "opacity": 0.8,
                    "fontFamily": "Lato",
                    "fontSize": 28,
                    "fontWeight": 400,
                    "fill": "#93C5FD",
                    "align": "left",
                    "lineHeight": 1.3
                }
            ]
        }
    },
    {
        "name": "Infographic",
        "width": 800,
        "height": 2000,
        "canvas": {
            "version": 1,
            "width": 800,
            "height": 2000,
            "background": "#F8FAFC",
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "rect",
                    "x": 60,
                    "y": 60,
                    "width": 680,
                    "height": 240,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fill": "#1E293B",
                    "stroke": "#000000",
                    "strokeWidth": 0,
                    "cornerRadius": 24
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "SYSTEM ARCHITECTURE",
                    "x": 100,
                    "y": 120,
                    "width": 600,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fontFamily": "PlayfairDisplay",
                    "fontSize": 40,
                    "fontWeight": 700,
                    "fill": "#FFFFFF",
                    "align": "center",
                    "lineHeight": 1.2
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "shape",
                    "shape": "rect",
                    "x": 60,
                    "y": 360,
                    "width": 680,
                    "height": 380,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fill": "#FFFFFF",
                    "stroke": "#E2E8F0",
                    "strokeWidth": 2,
                    "cornerRadius": 20
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "1. Event-Driven Workflows",
                    "x": 100,
                    "y": 410,
                    "width": 600,
                    "rotation": 0,
                    "opacity": 1.0,
                    "fontFamily": "Lato",
                    "fontSize": 32,
                    "fontWeight": 700,
                    "fill": "#0F172A",
                    "align": "left",
                    "lineHeight": 1.2
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "text": "Pub/Sub decouples background export tasks and provides reliable delivery with retry semantics.",
                    "x": 100,
                    "y": 480,
                    "width": 580,
                    "rotation": 0,
                    "opacity": 0.8,
                    "fontFamily": "Lato",
                    "fontSize": 24,
                    "fontWeight": 400,
                    "fill": "#475569",
                    "align": "left",
                    "lineHeight": 1.4
                }
            ]
        }
    }
]

def seed_templates(db: Session):
    existing_count = db.query(Template).count()
    if existing_count == 0:
        logger.info("Seeding 5 default templates...")
        for item in SEED_TEMPLATES:
            tpl = Template(
                id=str(uuid.uuid4()),
                name=item["name"],
                width=item["width"],
                height=item["height"],
                canvas=item["canvas"]
            )
            db.add(tpl)
        db.commit()
        logger.info("Templates seeded successfully.")
    else:
        logger.info(f"Templates table already contains {existing_count} records.")
