"use client";

import React, { useRef } from "react";
import {
  LayoutTemplate,
  Square,
  Circle,
  Type,
  Upload,
  Layers,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const TABS = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "elements", label: "Elements", icon: Square },
  { id: "text", label: "Text", icon: Type },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "layers", label: "Layers", icon: Layers },
];

export function EditorSidebar({
  activeTab,
  onTabChange,
  templates = [],
  userAssets = [],
  canvas,
  selectedId,
  onSelectElement,
  onAddText,
  onAddShape,
  onAddImage,
  onApplyTemplate,
  onUploadAsset,
  onDeleteAsset,
  onReorderElement,
  onDeleteElement,
  uploadingAsset = false,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="flex h-full border-r border-border bg-white z-10">
      {/* 1. Narrow Icon Rail (60px) */}
      <nav
        aria-label="Editor tools"
        className="w-[60px] flex flex-col items-center py-3 border-r border-border bg-white space-y-1 select-none flex-shrink-0"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(isActive ? null : tab.id)}
              className={`w-12 h-12 flex flex-col items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                isActive
                  ? "bg-slate-100 text-accent font-semibold"
                  : "text-text-muted hover:text-text hover:bg-slate-50"
              }`}
              title={tab.label}
              aria-pressed={isActive}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="text-[10px] mt-1 leading-none">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 2. 300px Flyout Panel (Open when activeTab is not null) */}
      {activeTab && (
        <aside
          aria-label={`${activeTab} panel`}
          className="w-[300px] h-full flex flex-col bg-white border-r border-border overflow-hidden select-none"
        >
          {/* Panel Header */}
          <div className="h-11 px-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-text">
              {TABS.find((t) => t.id === activeTab)?.label}
            </span>
            <button
              type="button"
              onClick={() => onTabChange(null)}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-accent/20"
              aria-label="Close panel"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Panel Content Body */}
          <div className="flex-1 overflow-y-auto p-4 text-xs text-text space-y-4">
            {/* TEMPLATES TAB */}
            {activeTab === "templates" && (
              <div className="space-y-3">
                <p className="text-xs text-text-muted">
                  Choose a template to replace your canvas.
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => onApplyTemplate(tpl)}
                      className="p-3 rounded border border-border bg-white hover:border-accent hover:shadow-sm text-left transition group focus:outline-none focus:ring-2 focus:ring-accent/20 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-text group-hover:text-accent transition">
                          {tpl.name}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">
                          {tpl.width}×{tpl.height}
                        </span>
                      </div>
                      <span className="mt-2 text-[11px] text-text-muted group-hover:text-accent font-medium">
                        Apply template &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ELEMENTS TAB */}
            {activeTab === "elements" && (
              <div className="space-y-3">
                <p className="text-xs text-text-muted">
                  Click or drag a shape onto the artboard.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Rectangle */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onAddShape("rect")}
                    onKeyDown={(e) => e.key === "Enter" && onAddShape("rect")}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/pixelforge-element",
                        JSON.stringify({ type: "shape", shape: "rect", width: 250, height: 180 })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="p-4 rounded border border-border bg-white hover:border-accent hover:bg-slate-50 transition cursor-grab active:cursor-grabbing flex flex-col items-center justify-center space-y-2 group focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <div className="h-10 w-14 rounded-sm border-2 border-accent bg-accent/10" />
                    <span className="text-xs font-medium text-text group-hover:text-accent">
                      Rectangle
                    </span>
                  </div>

                  {/* Ellipse */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onAddShape("ellipse")}
                    onKeyDown={(e) => e.key === "Enter" && onAddShape("ellipse")}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/pixelforge-element",
                        JSON.stringify({ type: "shape", shape: "ellipse", width: 200, height: 200 })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="p-4 rounded border border-border bg-white hover:border-accent hover:bg-slate-50 transition cursor-grab active:cursor-grabbing flex flex-col items-center justify-center space-y-2 group focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <div className="h-10 w-10 rounded-full border-2 border-accent bg-accent/10" />
                    <span className="text-xs font-medium text-text group-hover:text-accent">
                      Ellipse
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TEXT TAB */}
            {activeTab === "text" && (
              <div className="space-y-3">
                <p className="text-xs text-text-muted">
                  Click or drag text onto the artboard.
                </p>

                <div className="space-y-2">
                  {/* Heading */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onAddText({ text: "Heading Text", fontSize: 48, fontWeight: 700 })}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      onAddText({ text: "Heading Text", fontSize: 48, fontWeight: 700 })
                    }
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/pixelforge-element",
                        JSON.stringify({
                          type: "text",
                          text: "Heading Text",
                          fontSize: 48,
                          fontWeight: 700,
                          width: 450,
                        })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="p-3 rounded border border-border bg-white hover:border-accent hover:bg-slate-50 transition cursor-grab active:cursor-grabbing group focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <span className="text-lg font-bold text-text group-hover:text-accent block">
                      Add a heading
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">48px bold</span>
                  </div>

                  {/* Subheading */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onAddText({ text: "Subheading Text", fontSize: 32, fontWeight: 700 })
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      onAddText({ text: "Subheading Text", fontSize: 32, fontWeight: 700 })
                    }
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/pixelforge-element",
                        JSON.stringify({
                          type: "text",
                          text: "Subheading Text",
                          fontSize: 32,
                          fontWeight: 700,
                          width: 380,
                        })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="p-3 rounded border border-border bg-white hover:border-accent hover:bg-slate-50 transition cursor-grab active:cursor-grabbing group focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <span className="text-sm font-semibold text-text group-hover:text-accent block">
                      Add a subheading
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">32px bold</span>
                  </div>

                  {/* Body text */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onAddText({ text: "Body text content", fontSize: 18, fontWeight: 400 })}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      onAddText({ text: "Body text content", fontSize: 18, fontWeight: 400 })
                    }
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/pixelforge-element",
                        JSON.stringify({
                          type: "text",
                          text: "Body text content",
                          fontSize: 18,
                          fontWeight: 400,
                          width: 320,
                        })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="p-3 rounded border border-border bg-white hover:border-accent hover:bg-slate-50 transition cursor-grab active:cursor-grabbing group focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <span className="text-xs text-text group-hover:text-accent block">
                      Add a little bit of body text
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">18px regular</span>
                  </div>
                </div>
              </div>
            )}

            {/* UPLOADS TAB */}
            {activeTab === "uploads" && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onUploadAsset}
                  className="hidden"
                />

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  loading={uploadingAsset}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} strokeWidth={1.75} className="mr-1" />
                  <span>Upload image</span>
                </Button>

                {userAssets.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">
                    No uploaded images yet. Upload a PNG, JPEG, or WebP up to 10MB.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5">
                    {userAssets.map((asset) => (
                      <div
                        key={asset.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onAddImage(asset)}
                        onKeyDown={(e) => e.key === "Enter" && onAddImage(asset)}
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/pixelforge-element",
                            JSON.stringify({
                              type: "image",
                              assetId: asset.id,
                              assetUrl: asset.url,
                              width: Math.min(400, asset.width || 400),
                              height: Math.min(400, asset.height || 400),
                            })
                          );
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="group relative aspect-square rounded border border-border bg-slate-50 overflow-hidden hover:border-accent transition flex items-center justify-center p-1.5 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-accent/20"
                        title={asset.filename}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="max-h-full max-w-full object-contain pointer-events-none"
                        />

                        {/* Delete Asset Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAsset(asset.id);
                          }}
                          className="absolute top-1 right-1 h-5 w-5 rounded bg-white/90 border border-border text-text-muted hover:text-danger flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                          title="Delete image"
                          aria-label="Delete image"
                        >
                          <Trash2 size={11} strokeWidth={1.75} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LAYERS TAB */}
            {activeTab === "layers" && (
              <div className="space-y-2">
                <p className="text-xs text-text-muted">
                  Elements ordered from top to bottom.
                </p>

                {canvas.elements.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">
                    No elements on canvas.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5">
                    {/* Index 0 is bottom per SPEC; show top-to-bottom so reverse array */}
                    {[...canvas.elements].reverse().map((el, reverseIndex) => {
                      const isSelected = selectedId === el.id;

                      const getLabel = () => {
                        if (el.type === "text") return el.text || "Text";
                        if (el.type === "shape") return `${el.shape === "rect" ? "Rectangle" : "Ellipse"}`;
                        if (el.type === "image") return "Image";
                        return "Element";
                      };

                      return (
                        <div
                          key={el.id}
                          onClick={() => onSelectElement(el.id)}
                          className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition ${
                            isSelected
                              ? "border-accent bg-slate-50 font-medium"
                              : "border-border bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate max-w-[140px]">{getLabel()}</span>

                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReorderElement("up", el.id);
                              }}
                              className="p-1 rounded text-text-muted hover:text-text hover:bg-slate-100"
                              title="Bring forward"
                              aria-label="Bring layer forward"
                            >
                              <ChevronUp size={13} strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReorderElement("down", el.id);
                              }}
                              className="p-1 rounded text-text-muted hover:text-text hover:bg-slate-100"
                              title="Send backward"
                              aria-label="Send layer backward"
                            >
                              <ChevronDown size={13} strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteElement(el.id);
                              }}
                              className="p-1 rounded text-text-muted hover:text-danger hover:bg-red-50"
                              title="Delete element"
                              aria-label="Delete element"
                            >
                              <Trash2 size={13} strokeWidth={1.75} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
