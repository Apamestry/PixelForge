"use client";

import React, { useState } from "react";
import {
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
} from "lucide-react";

const CANVAS_PRESETS = [
  { label: "Instagram post (1080 × 1080)", width: 1080, height: 1080 },
  { label: "Poster (1080 × 1350)", width: 1080, height: 1350 },
  { label: "YouTube thumbnail (1280 × 720)", width: 1280, height: 720 },
  { label: "LinkedIn banner (1584 × 396)", width: 1584, height: 396 },
  { label: "Infographic (800 × 2000)", width: 800, height: 2000 },
];

export function ContextualToolbar({
  selectedElement,
  canvas,
  fontsList = [],
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onReorderElement,
  onSetBackground,
  onSetCanvasSize,
}) {
  const [customW, setCustomW] = useState(canvas?.width || 1080);
  const [customH, setCustomH] = useState(canvas?.height || 1080);

  // If no element is selected, display Design toolbar
  if (!selectedElement) {
    return (
      <div className="h-11 border-b border-border bg-white px-4 flex items-center justify-between text-xs text-text select-none overflow-x-auto">
        <div className="flex items-center space-x-6">
          <span className="font-semibold text-xs text-text">Design:</span>

          {/* Background color picker */}
          <div className="flex items-center space-x-1.5">
            <span className="text-text-muted">Background:</span>
            <input
              type="color"
              value={canvas?.background || "#FFFFFF"}
              onChange={(e) => onSetBackground(e.target.value)}
              className="h-6 w-6 rounded border border-border bg-transparent cursor-pointer"
              title="Canvas background color"
            />
            <span className="font-mono text-[11px] text-text-muted uppercase">
              {canvas?.background || "#FFFFFF"}
            </span>
          </div>

          {/* Size preset dropdown */}
          <div className="flex items-center space-x-1.5 pl-3 border-l border-border">
            <span className="text-text-muted">Preset:</span>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const [w, h] = val.split("x").map(Number);
                onSetCanvasSize({ width: w, height: h });
                setCustomW(w);
                setCustomH(h);
              }}
              className="h-7 rounded border border-border bg-white px-2 text-xs text-text focus:outline-none focus:border-accent"
              value=""
            >
              <option value="" disabled>
                Select preset...
              </option>
              {CANVAS_PRESETS.map((p) => (
                <option key={p.label} value={`${p.width}x${p.height}`}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom dimensions */}
          <div className="flex items-center space-x-1.5 pl-3 border-l border-border font-mono text-[11px]">
            <span className="text-text-muted font-sans text-xs">Dimensions:</span>
            <input
              type="number"
              min={100}
              max={4000}
              value={customW}
              onChange={(e) => setCustomW(e.target.value)}
              onBlur={() => onSetCanvasSize({ width: customW, height: customH })}
              onKeyDown={(e) => e.key === "Enter" && onSetCanvasSize({ width: customW, height: customH })}
              className="h-7 w-14 rounded border border-border px-1 text-center text-xs text-text focus:outline-none focus:border-accent"
              title="Canvas width (px)"
            />
            <span className="text-text-muted">×</span>
            <input
              type="number"
              min={100}
              max={4000}
              value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              onBlur={() => onSetCanvasSize({ width: customW, height: customH })}
              onKeyDown={(e) => e.key === "Enter" && onSetCanvasSize({ width: customW, height: customH })}
              className="h-7 w-14 rounded border border-border px-1 text-center text-xs text-text focus:outline-none focus:border-accent"
              title="Canvas height (px)"
            />
            <span className="text-text-muted">px</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-11 border-b border-border bg-white px-4 flex items-center justify-between text-xs text-text select-none overflow-x-auto">
      {/* Left: Element specific controls */}
      <div className="flex items-center space-x-3">
        {/* TEXT CONTROLS */}
        {selectedElement.type === "text" && (
          <>
            {/* Font family */}
            <select
              value={selectedElement.fontFamily || "Roboto"}
              onChange={(e) =>
                onUpdateElement({ ...selectedElement, fontFamily: e.target.value })
              }
              className="h-7 rounded border border-border bg-white px-2 text-xs font-medium text-text focus:outline-none focus:border-accent"
              style={{ fontFamily: selectedElement.fontFamily || "Roboto" }}
              aria-label="Font family"
            >
              {fontsList.map((f) => (
                <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
                  {f.family}
                </option>
              ))}
            </select>

            {/* Font size */}
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min={8}
                max={300}
                value={selectedElement.fontSize || 24}
                onChange={(e) =>
                  onUpdateElement({
                    ...selectedElement,
                    fontSize: Math.max(8, parseInt(e.target.value, 10) || 12),
                  })
                }
                className="h-7 w-14 rounded border border-border px-1.5 text-center text-xs text-text font-mono focus:outline-none focus:border-accent"
                aria-label="Font size"
              />
            </div>

            {/* Bold */}
            <button
              type="button"
              onClick={() =>
                onUpdateElement({
                  ...selectedElement,
                  fontWeight: selectedElement.fontWeight === 700 ? 400 : 700,
                })
              }
              className={`h-7 w-7 rounded flex items-center justify-center border transition ${
                selectedElement.fontWeight === 700
                  ? "border-accent bg-slate-100 text-accent font-bold"
                  : "border-border text-text-muted hover:text-text hover:bg-slate-50"
              }`}
              title="Bold (700)"
              aria-label="Toggle bold"
            >
              <Bold size={14} strokeWidth={selectedElement.fontWeight === 700 ? 2.5 : 1.75} />
            </button>

            {/* Alignment */}
            <div className="flex items-center rounded border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => onUpdateElement({ ...selectedElement, align: "left" })}
                className={`h-7 px-2 flex items-center justify-center transition ${
                  selectedElement.align === "left"
                    ? "bg-slate-100 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
                title="Align left"
              >
                <AlignLeft size={14} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => onUpdateElement({ ...selectedElement, align: "center" })}
                className={`h-7 px-2 flex items-center justify-center transition border-l border-r border-border ${
                  selectedElement.align === "center"
                    ? "bg-slate-100 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
                title="Align center"
              >
                <AlignCenter size={14} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => onUpdateElement({ ...selectedElement, align: "right" })}
                className={`h-7 px-2 flex items-center justify-center transition ${
                  selectedElement.align === "right"
                    ? "bg-slate-100 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
                title="Align right"
              >
                <AlignRight size={14} strokeWidth={1.75} />
              </button>
            </div>

            {/* Text Color */}
            <div className="flex items-center space-x-1 pl-1">
              <input
                type="color"
                value={selectedElement.fill || "#000000"}
                onChange={(e) => onUpdateElement({ ...selectedElement, fill: e.target.value })}
                className="h-6 w-6 rounded border border-border bg-transparent cursor-pointer"
                title="Text color"
              />
            </div>
          </>
        )}

        {/* SHAPE CONTROLS */}
        {selectedElement.type === "shape" && (
          <>
            {/* Fill Color */}
            <div className="flex items-center space-x-1.5">
              <span className="text-text-muted text-[11px]">Fill:</span>
              <input
                type="color"
                value={selectedElement.fill || "#065A82"}
                onChange={(e) => onUpdateElement({ ...selectedElement, fill: e.target.value })}
                className="h-6 w-6 rounded border border-border bg-transparent cursor-pointer"
                title="Shape fill color"
              />
            </div>

            {/* Stroke Color */}
            <div className="flex items-center space-x-1.5 pl-2 border-l border-border">
              <span className="text-text-muted text-[11px]">Stroke:</span>
              <input
                type="color"
                value={selectedElement.stroke || "#000000"}
                onChange={(e) => onUpdateElement({ ...selectedElement, stroke: e.target.value })}
                className="h-6 w-6 rounded border border-border bg-transparent cursor-pointer"
                title="Stroke color"
              />
              <input
                type="number"
                min={0}
                max={50}
                value={selectedElement.strokeWidth || 0}
                onChange={(e) =>
                  onUpdateElement({
                    ...selectedElement,
                    strokeWidth: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
                className="h-7 w-12 rounded border border-border px-1 text-center text-xs text-text font-mono focus:outline-none focus:border-accent"
                title="Stroke width (px)"
                aria-label="Stroke width"
              />
            </div>

            {/* Corner Radius (rect only) */}
            {selectedElement.shape === "rect" && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-border">
                <span className="text-text-muted text-[11px]">Radius:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={selectedElement.cornerRadius || 0}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      cornerRadius: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="h-7 w-12 rounded border border-border px-1 text-center text-xs text-text font-mono focus:outline-none focus:border-accent"
                  title="Corner radius (px)"
                  aria-label="Corner radius"
                />
              </div>
            )}
          </>
        )}

        {/* IMAGE CONTROLS */}
        {selectedElement.type === "image" && (
          <div className="flex items-center space-x-3 text-[11px]">
            {/* Brightness */}
            <div className="flex items-center space-x-1">
              <span className="text-text-muted">Bright:</span>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={selectedElement.filters?.brightness || 0}
                onChange={(e) =>
                  onUpdateElement(
                    {
                      ...selectedElement,
                      filters: {
                        ...selectedElement.filters,
                        brightness: parseFloat(e.target.value),
                      },
                    },
                    true
                  )
                }
                className="w-16 accent-accent h-1.5"
                title={`Brightness: ${selectedElement.filters?.brightness || 0}`}
              />
            </div>

            {/* Contrast */}
            <div className="flex items-center space-x-1">
              <span className="text-text-muted">Contrast:</span>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={selectedElement.filters?.contrast || 0}
                onChange={(e) =>
                  onUpdateElement(
                    {
                      ...selectedElement,
                      filters: {
                        ...selectedElement.filters,
                        contrast: parseFloat(e.target.value),
                      },
                    },
                    true
                  )
                }
                className="w-16 accent-accent h-1.5"
                title={`Contrast: ${selectedElement.filters?.contrast || 0}`}
              />
            </div>

            {/* Saturation */}
            <div className="flex items-center space-x-1">
              <span className="text-text-muted">Sat:</span>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={selectedElement.filters?.saturation || 0}
                onChange={(e) =>
                  onUpdateElement(
                    {
                      ...selectedElement,
                      filters: {
                        ...selectedElement.filters,
                        saturation: parseFloat(e.target.value),
                      },
                    },
                    true
                  )
                }
                className="w-16 accent-accent h-1.5"
                title={`Saturation: ${selectedElement.filters?.saturation || 0}`}
              />
            </div>

            {/* Grayscale toggle */}
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(selectedElement.filters?.grayscale)}
                onChange={(e) =>
                  onUpdateElement({
                    ...selectedElement,
                    filters: {
                      ...selectedElement.filters,
                      grayscale: e.target.checked,
                    },
                  })
                }
                className="rounded border-border text-accent focus:ring-0 h-3.5 w-3.5"
              />
              <span className="text-text-muted">Grayscale</span>
            </label>
          </div>
        )}
      </div>

      {/* Right: Universal controls (Opacity, Layers, Duplicate, Delete) */}
      <div className="flex items-center space-x-2 pl-3 border-l border-border">
        {/* Opacity */}
        <div className="flex items-center space-x-1.5">
          <span className="text-text-muted text-[11px]">Opacity:</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={selectedElement.opacity !== undefined ? selectedElement.opacity : 1.0}
            onChange={(e) =>
              onUpdateElement(
                {
                  ...selectedElement,
                  opacity: parseFloat(e.target.value),
                },
                true
              )
            }
            className="w-16 accent-accent h-1.5"
            title={`Opacity: ${Math.round((selectedElement.opacity ?? 1) * 100)}%`}
          />
          <span className="text-[10px] text-text-muted font-mono w-6 text-right">
            {Math.round((selectedElement.opacity ?? 1) * 100)}%
          </span>
        </div>

        {/* Bring Forward / Send Backward */}
        <div className="flex items-center rounded border border-border">
          <button
            type="button"
            onClick={() => onReorderElement("up")}
            className="p-1 text-text-muted hover:text-text hover:bg-slate-50 transition"
            title="Bring forward"
            aria-label="Bring layer forward"
          >
            <ChevronUp size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => onReorderElement("down")}
            className="p-1 text-text-muted hover:text-text hover:bg-slate-50 transition border-l border-border"
            title="Send backward"
            aria-label="Send layer backward"
          >
            <ChevronDown size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Duplicate */}
        <button
          type="button"
          onClick={onDuplicateElement}
          className="p-1.5 rounded text-text-muted hover:text-text hover:bg-slate-100 transition"
          title="Duplicate (Ctrl/Cmd+D)"
          aria-label="Duplicate element"
        >
          <Copy size={15} strokeWidth={1.75} />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDeleteElement}
          className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-red-50 transition"
          title="Delete (Delete/Backspace)"
          aria-label="Delete element"
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
