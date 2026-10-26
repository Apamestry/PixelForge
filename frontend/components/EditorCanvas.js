"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Image as KonvaImage, Transformer, Line } from "react-konva";
import { ensureFontLoaded } from "@/lib/fontLoader";

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
function CanvasImageElement({ element, assetUrl, isSelected, onSelect, onChange, onDragMove, onDragEnd }) {
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
      onDragMove={onDragMove}
      onDragEnd={(e) => {
        if (onDragEnd) onDragEnd();
        onChange({
          ...element,
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={() => {
        const node = imageRef.current;
        if (!node) return;
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

// Single Text Element with font preloading and double-click in-place edit
function CanvasTextElement({
  element,
  isSelected,
  isEditing,
  onSelect,
  onDoubleClick,
  onChange,
  onDragMove,
  onDragEnd,
}) {
  const textRef = useRef();

  useEffect(() => {
    if (element.fontFamily) {
      ensureFontLoaded(element.fontFamily, element.fontWeight || 400, element.fontSize || 24).then(() => {
        if (textRef.current) {
          textRef.current.getLayer()?.batchDraw();
        }
      });
    }
  }, [element.fontFamily, element.fontWeight, element.fontSize]);

  return (
    <Text
      ref={textRef}
      id={element.id}
      visible={!isEditing}
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
      draggable={!isEditing}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      onDragMove={onDragMove}
      onDragEnd={(e) => {
        if (onDragEnd) onDragEnd();
        onChange({
          ...element,
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={() => {
        const node = textRef.current;
        if (!node) return;
        const scaleX = node.scaleX();

        node.scaleX(1);
        node.scaleY(1);

        onChange({
          ...element,
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(20, Math.round(node.width() * scaleX)),
          rotation: Math.round(node.rotation()),
        });
      }}
    />
  );
}

// Single Shape Element (Rect or Ellipse)
function CanvasShapeElement({ element, isSelected, onSelect, onChange, onDragMove, onDragEnd }) {
  const shapeRef = useRef();

  if (element.shape === "ellipse") {
    return (
      <Ellipse
        ref={shapeRef}
        id={element.id}
        x={element.x + element.width / 2}
        y={element.y + (element.height || element.width) / 2}
        radiusX={element.width / 2}
        radiusY={(element.height || element.width) / 2}
        fill={element.fill || "#065A82"}
        stroke={element.strokeWidth ? element.stroke || "#000000" : null}
        strokeWidth={element.strokeWidth || 0}
        rotation={element.rotation || 0}
        opacity={element.opacity !== undefined ? element.opacity : 1.0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={onDragMove}
        onDragEnd={(e) => {
          if (onDragEnd) onDragEnd();
          onChange({
            ...element,
            x: Math.round(e.target.x() - element.width / 2),
            y: Math.round(e.target.y() - (element.height || element.width) / 2),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          const newW = Math.max(5, Math.round(node.radiusX() * 2 * scaleX));
          const newH = Math.max(5, Math.round(node.radiusY() * 2 * scaleY));

          onChange({
            ...element,
            x: Math.round(node.x() - newW / 2),
            y: Math.round(node.y() - newH / 2),
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
      fill={element.fill || "#065A82"}
      stroke={element.strokeWidth ? element.stroke || "#000000" : null}
      strokeWidth={element.strokeWidth || 0}
      cornerRadius={element.cornerRadius || 0}
      rotation={element.rotation || 0}
      opacity={element.opacity !== undefined ? element.opacity : 1.0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={(e) => {
        if (onDragEnd) onDragEnd();
        onChange({
          ...element,
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (!node) return;
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
  snapGuides = [],
  onSelectElement,
  onUpdateElement,
  onDropElement,
  onDragMoveElement,
  onDragEndClearGuides,
  stageScale = 1.0,
}) {
  const stageRef = useRef();
  const trRef = useRef();

  // Inline text editing state
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState("");

  const editingElement = canvas.elements.find((el) => el.id === editingTextId);

  // Attach transformer to selected element
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const stage = stageRef.current;

    if (selectedId && !editingTextId) {
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, editingTextId, canvas.elements]);

  function handleStageClick(e) {
    if (editingTextId) {
      commitEditingText();
    }
    if (e.target === e.target.getStage() || e.target.id() === "bg-canvas-rect") {
      onSelectElement(null);
    }
  }

  function startEditingText(element) {
    setEditingTextId(element.id);
    setEditingTextValue(element.text || "");
  }

  const commitEditingText = useCallback(() => {
    if (!editingTextId) return;
    const el = canvas.elements.find((item) => item.id === editingTextId);
    if (el && el.text !== editingTextValue) {
      onUpdateElement({ ...el, text: editingTextValue });
    }
    setEditingTextId(null);
  }, [editingTextId, editingTextValue, canvas.elements, onUpdateElement]);

  function cancelEditingText() {
    setEditingTextId(null);
  }

  const { width = 1080, height = 1080, background = "#FFFFFF", elements = [] } = canvas;

  return (
    <div className="flex items-center justify-center p-8 min-h-full">
      <div
        className="relative shadow-md rounded-sm transition-all overflow-hidden border border-slate-300 bg-white"
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
                    onDragMove={onDragMoveElement}
                    onDragEnd={onDragEndClearGuides}
                  />
                );
              }
              if (el.type === "text") {
                return (
                  <CanvasTextElement
                    key={el.id}
                    element={el}
                    isSelected={el.id === selectedId}
                    isEditing={el.id === editingTextId}
                    onSelect={() => onSelectElement(el.id)}
                    onDoubleClick={() => startEditingText(el)}
                    onChange={onUpdateElement}
                    onDragMove={onDragMoveElement}
                    onDragEnd={onDragEndClearGuides}
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
                    onDragMove={onDragMoveElement}
                    onDragEnd={onDragEndClearGuides}
                  />
                );
              }
              return null;
            })}

            {/* Konva Transformer */}
            <Transformer
              ref={trRef}
              rotateAnchorOffset={24}
              anchorCornerRadius={2}
              anchorSize={8}
              anchorStroke="#065A82"
              anchorFill="#FFFFFF"
              borderStroke="#065A82"
              borderDash={[4, 4]}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                  return oldBox;
                }
                return newBox;
              }}
            />

            {/* Snap guide lines during drag */}
            {snapGuides.map((guide, i) =>
              guide.orientation === "vertical" ? (
                <Line
                  key={`snap-v-${i}`}
                  points={[guide.position, 0, guide.position, height]}
                  stroke="#00BCD4"
                  strokeWidth={1 / stageScale}
                  dash={[4 / stageScale, 4 / stageScale]}
                  listening={false}
                />
              ) : (
                <Line
                  key={`snap-h-${i}`}
                  points={[0, guide.position, width, guide.position]}
                  stroke="#00BCD4"
                  strokeWidth={1 / stageScale}
                  dash={[4 / stageScale, 4 / stageScale]}
                  listening={false}
                />
              )
            )}
          </Layer>
        </Stage>

        {/* In-place Textarea overlay for inline text editing */}
        {editingTextId && editingElement && (
          <textarea
            value={editingTextValue}
            onChange={(e) => setEditingTextValue(e.target.value)}
            onBlur={commitEditingText}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitEditingText();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEditingText();
              }
            }}
            autoFocus
            style={{
              position: "absolute",
              left: `${editingElement.x * stageScale}px`,
              top: `${editingElement.y * stageScale}px`,
              width: `${Math.max(60, editingElement.width * stageScale)}px`,
              minHeight: `${(editingElement.fontSize || 24) * 1.3 * stageScale}px`,
              fontSize: `${(editingElement.fontSize || 24) * stageScale}px`,
              fontFamily: editingElement.fontFamily || "Roboto",
              fontWeight: editingElement.fontWeight === 700 ? "bold" : "normal",
              color: editingElement.fill || "#000000",
              textAlign: editingElement.align || "left",
              lineHeight: editingElement.lineHeight || 1.2,
              background: "transparent",
              border: "1px dashed #065A82",
              outline: "none",
              padding: 0,
              margin: 0,
              resize: "none",
              overflow: "hidden",
              zIndex: 30,
            }}
          />
        )}
      </div>
    </div>
  );
}
