from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator

# --- Auth Schemas ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Canvas Element Schemas ---
class ImageFilters(BaseModel):
    brightness: float = Field(0.0, ge=-1.0, le=1.0)
    contrast: float = Field(0.0, ge=-1.0, le=1.0)
    saturation: float = Field(0.0, ge=-1.0, le=1.0)
    grayscale: bool = False

class CanvasElement(BaseModel):
    id: str
    type: Literal["image", "text", "shape"]
    x: float
    y: float
    width: float = Field(..., gt=0)
    height: Optional[float] = Field(None, gt=0)
    rotation: float = 0.0
    opacity: float = Field(1.0, ge=0.0, le=1.0)

    # image specific
    assetId: Optional[str] = None
    filters: Optional[ImageFilters] = None

    # text specific
    text: Optional[str] = None
    fontFamily: Optional[str] = None
    fontSize: Optional[float] = Field(None, gt=0)
    fontWeight: Optional[Literal[400, 700]] = 400
    fill: Optional[str] = None
    align: Optional[Literal["left", "center", "right"]] = "left"
    lineHeight: Optional[float] = 1.2

    # shape specific
    shape: Optional[Literal["rect", "ellipse"]] = None
    stroke: Optional[str] = None
    strokeWidth: Optional[float] = 0.0
    cornerRadius: Optional[float] = 0.0

    @model_validator(mode="after")
    def validate_type_fields(self):
        if self.type == "shape":
            if not self.shape or self.shape not in ("rect", "ellipse"):
                raise ValueError("Shape element must have shape 'rect' or 'ellipse'")
            if self.height is None:
                raise ValueError("Shape element requires height")
        elif self.type == "image":
            if not self.assetId:
                raise ValueError("Image element requires assetId")
            if self.height is None:
                raise ValueError("Image element requires height")
        elif self.type == "text":
            if self.text is None:
                raise ValueError("Text element requires text field")
        return self

class CanvasJSON(BaseModel):
    version: int = 1
    width: int = Field(..., gt=0, le=4000)
    height: int = Field(..., gt=0, le=4000)
    background: str = "#FFFFFF"
    elements: List[CanvasElement] = Field(default_factory=list, max_length=200)

# --- Template Schemas ---
class TemplateResponse(BaseModel):
    id: str
    name: str
    width: int
    height: int
    canvas: Dict[str, Any]

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    templateId: Optional[str] = None
    width: Optional[int] = Field(None, gt=0, le=4000)
    height: Optional[int] = Field(None, gt=0, le=4000)

class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    canvas: Optional[Dict[str, Any]] = None

    @field_validator("canvas")
    @classmethod
    def validate_canvas_data(cls, v):
        if v is not None:
            # Validate with CanvasJSON model
            CanvasJSON.model_validate(v)
        return v

class ProjectResponse(BaseModel):
    id: str
    name: str
    canvas: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    assetUrls: Optional[Dict[str, str]] = None

    class Config:
        from_attributes = True

# --- Asset Schemas ---
class AssetResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    width: int
    height: int
    created_at: datetime
    url: Optional[str] = None

    class Config:
        from_attributes = True

# --- Export Schemas ---
class ExportCreateRequest(BaseModel):
    projectId: str
    format: Literal["png", "jpeg", "pdf"]
    scale: Literal[1, 2] = 1

class ExportResponse(BaseModel):
    id: str
    status: str
    format: str
    error: Optional[str] = None
    downloadUrl: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
