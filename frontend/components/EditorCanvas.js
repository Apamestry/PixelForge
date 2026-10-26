"use client";

import React, { useRef, useEffect, useState } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Image as KonvaImage, Transformer } from "react-konva";

// Helper hook to load HTML Image with crossOrigin = "anonymous"
function useHtmlImage(src) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      setImage(img);
    };
  }, [src]);

  return image;
}

// Single Image Element with crossOrigin = "anonymous" and filters
function CanvasImageElement({ element, assetUrl, isSelected, onSelect, onChange }) {
  const imageRef = useRef();
  const htmlImg = useHtmlImage(assetUrl);

  return (
    <KonvaImage
      ref={imageRef}
      id={element.id}
      image={htmlImg}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation || 0}
      opacity={element.opacity !== undefined ? element.opacity : 1.0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          ...element,
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={(e) => {
        const node = imageRef.current;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        onChange({
          ...element,
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(5, Math.round(node.width() * scaleX)),
          height: Math.max(5, Math.round(node.height() * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    />
  );
}

// Single Text Element with font preloading and auto height
function CanvasTextElement({ element, isSelected, onSelect, onChange }) {
  const textRef = useRef();

  useEffect(() => {
    if (element.fontFamily && document && document.fonts) {
      document.fonts.load(`${element.fontWeight || 400} ${element.fontSize || 24}px "${element.fontFamily}"`).catch(() => {});
    }
  }, [element.fontFamily, element.fontWeight, element.fontSize]);

  return (
    <Text
      ref={textRef}
      id={element.id}
      text={element.text || ""}
      x={element.x}
      y={element.y}
      width={element.width}
      fontFamily={element.fontFamily || "Roboto"}
      fontSize={element.fontSize || 24}
      fontStyle={element.fontWeight === 700 ? "bold" : "normal"}
      fill={element.fill || "#000000"}
      align={element.align || "left"}
      lineHeight={element.lineHeight || 1.2}
      rotation={element.rotation || 0}
      opacity={element.opacity !== undefined ? element.opacity : 1.0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          ...element,
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={(e) => {
        const node = textRef.current;
        const scaleX = node.scaleX();

        node.scaleX(1);
        node.scaleY(1);

        onChange({
          ...element,
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          // For text, bake scaleX into width only (Pitfall #2)
          width: Math.max(20, Math.round(node.width() * scaleX)),
          rotation: Math.round(node.rotation()),
        });
      }}
    />
  );
}

// Single Shape Element (Rect or Ellipse)
function CanvasShapeElement({ element, isSelected, onSelect, onChange }) {
  const shapeRef = useRef();

  if (element.shape === "ellipse") {
    return (
      <Ellipse
        ref={shapeRef}
        id={element.id}
        x={element.x + (element.width / 2)}
        y={element.y + ((element.height || element.width) / 2)}
        radiusX={element.width / 2}
        radiusY={(element.height || element.width) / 2}
        fill={element.fill || "#6366F1"}
        stroke={element.strokeWidth ? element.stroke || "#000000" : null}
        strokeWidth={element.strokeWidth || 0}
        rotation={element.rotation || 0}
        opacity={element.opacity !== undefined ? element.opacity : 1.0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            ...element,
            x: Math.round(e.target.x() - (element.width / 2)),
            y: Math.round(e.target.y() - ((element.height || element.width) / 2)),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          const newW = Math.max(5, Math.round(node.radiusX() * 2 * scaleX));
          const newH = Math.max(5, Math.round(node.radiusY() * 2 * scaleY));

          onChange({
            ...element,
            x: Math.round(node.x() - (newW / 2)),
            y: Math.round(node.y() - (newH / 2)),
            width: newW,
            height: newH,
            rotation: Math.round(node.rotation()),
          });
        }}
      />
    );
  }

  // Rect
  return (
    <Rect
      ref={shapeRef}
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height || 100}
      fill={element.fill || "#6366F1"}
      stroke={element.strokeWidth ? element.stroke || "#000000" : null}
      strokeWidth={element.strokeWidth || 0}
      cornerRadius={element.cornerRadius || 0}
      rotation={element.rotation || 0}
      opacity={element.opacity !== undefined ? element.opacity : 1.0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          ...element,
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={(e) => {
        const node = shapeRef.current;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        onChange({
          ...element,
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(5, Math.round(node.width() * scaleX)),
          height: Math.max(5, Math.round(node.height() * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    />
  );
}

export default function EditorCanvas({
  canvas,
  assetUrls = {},
  selectedId,
  onSelectElement,
  onUpdateElement,
  onDropElement,
  stageScale = 1.0,
}) {
  const stageRef = useRef();
  const trRef = useRef();

  // Attach transformer to selected element
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const stage = stageRef.current;
    if (selectedId) {
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer().batchDraw();
        return;
      }
    }
    trRef.current.nodes([]);
    trRef.current.getLayer().batchDraw();
  }, [selectedId, canvas.elements]);

  function handleStageClick(e) {
    if (e.target === e.target.getStage() || e.target.id() === "bg-canvas-rect") {
      onSelectElement(null);
    }
  }

  const { width = 1080, height = 1080, background = "#FFFFFF", elements = [] } = canvas;

  return (
    <div className="flex items-center justify-center p-8 min-h-full">
      <div
        className="shadow-2xl rounded-sm transition-all overflow-hidden border border-slate-700"
        style={{
          width: width * stageScale,
          height: height * stageScale,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer.getData("application/pixelforge-element");
          if (!raw) return;
          try {
            const payload = JSON.parse(raw);
            const stage = stageRef.current;
            if (stage && onDropElement) {
              stage.setPointersPositions(e);
              const pointer = stage.getPointerPosition();
              onDropElement(payload, pointer);
            }
          } catch (err) {
            console.error("Failed to parse drop payload", err);
          }
        }}
      >
        <Stage
          ref={stageRef}
          width={width * stageScale}
          height={height * stageScale}
          scaleX={stageScale}
          scaleY={stageScale}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            {/* Background Canvas Rectangle */}
            <Rect
              id="bg-canvas-rect"
              x={0}
              y={0}
              width={width}
              height={height}
              fill={background}
              listening={true}
            />

            {/* Elements in Z-Order (index 0 is bottom) */}
            {elements.map((el) => {
              if (el.type === "shape") {
                return (
                  <CanvasShapeElement
                    key={el.id}
                    element={el}
                    isSelected={el.id === selectedId}
                    onSelect={() => onSelectElement(el.id)}
                    onChange={onUpdateElement}
                  />
                );
              }
              if (el.type === "text") {
                return (
                  <CanvasTextElement
                    key={el.id}
                    element={el}
                    isSelected={el.id === selectedId}
                    onSelect={() => onSelectElement(el.id)}
                    onChange={onUpdateElement}
                  />
                );
              }
              if (el.type === "image") {
                return (
                  <CanvasImageElement
                    key={el.id}
                    element={el}
                    assetUrl={assetUrls[el.assetId]}
                    isSelected={el.id === selectedId}
                    onSelect={() => onSelectElement(el.id)}
                    onChange={onUpdateElement}
                  />
                );
              }
              return null;
            })}

            {/* Konva Transformer */}
            <Transformer
              ref={trRef}
              rotateAnchorOffset={24}
              boundBoxFunc={(oldBox, newBox) => {
                // Minimum size limit
                if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
