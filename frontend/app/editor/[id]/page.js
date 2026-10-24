"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  Save,
  Download,
  Type,
  Square,
  Circle,
  Upload,
  Layers,
  ChevronUp,
  ChevronDown,
  Trash2,
  Check,
  Loader2,
  Image as ImageIcon
} from "lucide-react";

// Dynamically import EditorCanvas with ssr: false
const EditorCanvas = dynamic(() => import("@/components/EditorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  ),
});

export default function EditorPage() {
  const { id: projectId } = useParams();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [assetUrls, setAssetUrls] = useState({});
  const [userAssets, setUserAssets] = useState([]);
  const [fontsList, setFontsList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Saved"); // "Saved" | "Saving..." | "Unsaved"
  const [scaleFactor, setScaleFactor] = useState(0.7);

  // Export State
  const [exportFormat, setExportFormat] = useState("png");
  const [exportScale, setExportScale] = useState(1);
  const [exportModal, setExportModal] = useState(false);
  const [exportJob, setExportJob] = useState(null);
  const [exporting, setExporting] = useState(false);

  const autosaveTimerRef = useRef(null);

  // 1. Initial Load: Project + Fresh Asset URLs + Font Catalog + My Assets
  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, fontsRes, assetsRes] = await Promise.all([
          apiFetch(`/api/projects/${projectId}`),
          apiFetch("/fonts/list"),
          apiFetch("/api/assets"),
        ]);

        if (projRes.status === 404) {
          router.replace("/projects");
          return;
        }

        if (projRes.ok) {
          const data = await projRes.json();
          setProject(data);
          setCanvas(data.canvas);
          setAssetUrls(data.assetUrls || {});
        }

        if (fontsRes.ok) {
          const fonts = await fontsRes.json();
          setFontsList(fonts);
        }

        if (assetsRes.ok) {
          const assets = await assetsRes.json();
          setUserAssets(assets);
        }
      } catch (err) {
        console.error("Failed to load editor data", err);
      }
    }
    loadData();
  }, [projectId, router]);

  // 2. Keyboard listener for Delete / Backspace
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        // Only if not typing in an input or textarea
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
          return;
        }
        e.preventDefault();
        deleteSelectedElement();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, canvas]);

  // 3. Save Project
  const saveProject = useCallback(async (canvasToSave = canvas, nameToSave = project?.name) => {
    if (!canvasToSave) return;
    setSaveStatus("Saving...");
    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: nameToSave,
          canvas: canvasToSave,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProject(updated);
        setAssetUrls(updated.assetUrls || {});
        setSaveStatus("Saved");
      } else {
        setSaveStatus("Error saving");
      }
    } catch (err) {
      console.error("Save failed", err);
      setSaveStatus("Error saving");
    }
  }, [canvas, project, projectId]);

  // 4. Autosave after 3 seconds idle
  function triggerAutosave(newCanvas) {
    setSaveStatus("Unsaved");
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      saveProject(newCanvas, project?.name);
    }, 3000);
  }

  // Element Mutation Helpers
  function handleUpdateElement(updatedEl) {
    if (!canvas) return;
    const nextElements = canvas.elements.map((el) => (el.id === updatedEl.id ? updatedEl : el));
    const nextCanvas = { ...canvas, elements: nextElements };
    setCanvas(nextCanvas);
    triggerAutosave(nextCanvas);
  }

  function addTextElement() {
    if (!canvas) return;
    const newEl = {
      id: "text_" + Math.random().toString(36).substr(2, 9),
      type: "text",
      text: "Heading Text",
      x: Math.round(canvas.width / 4),
      y: Math.round(canvas.height / 3),
      width: 400,
      rotation: 0,
      opacity: 1.0,
      fontFamily: fontsList[0]?.family || "Roboto",
      fontSize: 48,
      fontWeight: 700,
      fill: "#111111",
      align: "left",
      lineHeight: 1.2,
    };
    const nextCanvas = { ...canvas, elements: [...canvas.elements, newEl] };
    setCanvas(nextCanvas);
    setSelectedId(newEl.id);
    triggerAutosave(nextCanvas);
  }

  function addShapeElement(shapeType) {
    if (!canvas) return;
    const newEl = {
      id: "shape_" + Math.random().toString(36).substr(2, 9),
      type: "shape",
      shape: shapeType,
      x: Math.round(canvas.width / 4),
      y: Math.round(canvas.height / 4),
      width: 250,
      height: 180,
      rotation: 0,
      opacity: 1.0,
      fill: shapeType === "rect" ? "#6366F1" : "#EC4899",
      stroke: "#000000",
      strokeWidth: 0,
      cornerRadius: shapeType === "rect" ? 12 : 0,
    };
    const nextCanvas = { ...canvas, elements: [...canvas.elements, newEl] };
    setCanvas(nextCanvas);
    setSelectedId(newEl.id);
    triggerAutosave(nextCanvas);
  }

  function addImageElement(asset) {
    if (!canvas) return;
    const newEl = {
      id: "img_" + Math.random().toString(36).substr(2, 9),
      type: "image",
      assetId: asset.id,
      x: Math.round(canvas.width / 4),
      y: Math.round(canvas.height / 4),
      width: Math.min(400, asset.width || 400),
      height: Math.min(400, asset.height || 400),
      rotation: 0,
      opacity: 1.0,
      filters: { brightness: 0, contrast: 0, saturation: 0, grayscale: false },
    };
    setAssetUrls((prev) => ({ ...prev, [asset.id]: asset.url }));
    const nextCanvas = { ...canvas, elements: [...canvas.elements, newEl] };
    setCanvas(nextCanvas);
    setSelectedId(newEl.id);
    triggerAutosave(nextCanvas);
  }

  async function handleAssetUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch("/api/assets", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newAsset = await res.json();
        setUserAssets((prev) => [newAsset, ...prev]);
        addImageElement(newAsset);
      }
    } catch (err) {
      console.error("Asset upload failed", err);
    }
  }

  function deleteSelectedElement() {
    if (!selectedId || !canvas) return;
    const nextElements = canvas.elements.filter((el) => el.id !== selectedId);
    const nextCanvas = { ...canvas, elements: nextElements };
    setCanvas(nextCanvas);
    setSelectedId(null);
    triggerAutosave(nextCanvas);
  }

  // Layer Order Operations
  function moveSelectedLayer(direction) {
    if (!selectedId || !canvas) return;
    const idx = canvas.elements.findIndex((el) => el.id === selectedId);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= canvas.elements.length) return;

    const elementsCopy = [...canvas.elements];
    const [moved] = elementsCopy.splice(idx, 1);
    elementsCopy.splice(targetIdx, 0, moved);

    const nextCanvas = { ...canvas, elements: elementsCopy };
    setCanvas(nextCanvas);
    triggerAutosave(nextCanvas);
  }

  // Export Flow (polling every 2s per SPEC Section 10)
  async function triggerExport() {
    setExporting(true);
    setExportJob(null);
    setExportModal(true);

    try {
      // 1. Snapshot current canvas to project first
      await saveProject(canvas, project?.name);

      // 2. Request Export
      const res = await apiFetch("/api/exports", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          format: exportFormat,
          scale: parseInt(exportScale, 10),
        }),
      });

      if (!res.ok) throw new Error("Failed to queue export");

      const job = await res.json();
      setExportJob(job);

      // 3. Poll every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await apiFetch(`/api/exports/${job.id}`);
          if (pollRes.ok) {
            const updatedJob = await pollRes.json();
            setExportJob(updatedJob);
            if (updatedJob.status === "done" || updatedJob.status === "failed") {
              clearInterval(pollInterval);
              setExporting(false);
            }
          }
        } catch (pollErr) {
          console.error("Polling error", pollErr);
        }
      }, 2000);
    } catch (err) {
      console.error("Export error", err);
      setExporting(false);
    }
  }

  if (!project || !canvas) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const selectedElement = canvas.elements.find((el) => el.id === selectedId);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <Link
            href="/projects"
            className="flex items-center space-x-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <input
            type="text"
            value={project.name}
            onChange={(e) => {
              const newName = e.target.value;
              setProject((p) => ({ ...p, name: newName }));
              triggerAutosave(canvas);
            }}
            className="bg-transparent font-semibold text-white text-sm hover:bg-slate-800/60 px-2 py-1 rounded focus:bg-slate-800 focus:outline-none"
          />
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>•</span>
            <span className={saveStatus === "Saved" ? "text-slate-400" : "text-amber-400"}>
              {saveStatus}
            </span>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center space-x-3">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
            <span>Zoom:</span>
            <button
              onClick={() => setScaleFactor((s) => Math.max(0.2, s - 0.1))}
              className="px-1.5 hover:text-white"
            >
              -
            </button>
            <span className="font-mono">{Math.round(scaleFactor * 100)}%</span>
            <button
              onClick={() => setScaleFactor((s) => Math.min(2.0, s + 0.1))}
              className="px-1.5 hover:text-white"
            >
              +
            </button>
          </div>

          <button
            onClick={() => saveProject(canvas, project.name)}
            className="flex items-center space-x-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition"
          >
            <Save size={14} />
            <span>Save</span>
          </button>

          <button
            onClick={triggerExport}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col p-4 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Add Elements</h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={addTextElement}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-850 hover:bg-slate-800 hover:border-slate-700 transition"
              >
                <Type size={20} className="text-indigo-400 mb-1" />
                <span className="text-[11px] font-medium">Text</span>
              </button>

              <button
                onClick={() => addShapeElement("rect")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-850 hover:bg-slate-800 hover:border-slate-700 transition"
              >
                <Square size={20} className="text-indigo-400 mb-1" />
                <span className="text-[11px] font-medium">Rectangle</span>
              </button>

              <button
                onClick={() => addShapeElement("ellipse")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-850 hover:bg-slate-800 hover:border-slate-700 transition"
              >
                <Circle size={20} className="text-indigo-400 mb-1" />
                <span className="text-[11px] font-medium">Ellipse</span>
              </button>
            </div>
          </div>

          {/* Layer Ordering (when element selected) */}
          {selectedElement && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>Layer Order</span>
                <span className="text-[10px] text-slate-500">Z-Index</span>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => moveSelectedLayer("up")}
                  className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition"
                >
                  <ChevronUp size={14} />
                  <span>Bring Up</span>
                </button>
                <button
                  onClick={() => moveSelectedLayer("down")}
                  className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition"
                >
                  <ChevronDown size={14} />
                  <span>Send Down</span>
                </button>
              </div>
            </div>
          )}

          {/* My Assets Section */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Assets</h2>
              <label className="cursor-pointer text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1">
                <Upload size={12} />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAssetUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-64 pr-1">
              {userAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => addImageElement(asset)}
                  className="group relative cursor-pointer aspect-square rounded-lg border border-slate-800 bg-slate-800/40 overflow-hidden hover:border-indigo-500 transition flex items-center justify-center p-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <span className="text-[10px] text-white font-semibold">Add</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Canvas Viewport */}
        <section className="flex-1 bg-slate-950 overflow-auto relative">
          <EditorCanvas
            canvas={canvas}
            assetUrls={assetUrls}
            selectedId={selectedId}
            onSelectElement={(id) => setSelectedId(id)}
            onUpdateElement={handleUpdateElement}
            stageScale={scaleFactor}
          />
        </section>

        {/* Right Properties Panel */}
        <aside className="w-72 border-l border-slate-800 bg-slate-900 p-4 overflow-y-auto">
          {selectedElement ? (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  {selectedElement.type} Properties
                </h2>
                <button
                  onClick={deleteSelectedElement}
                  title="Delete element"
                  className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Transform Position & Dimensions */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">X Position</label>
                    <input
                      type="number"
                      value={selectedElement.x}
                      onChange={(e) =>
                        handleUpdateElement({ ...selectedElement, x: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Y Position</label>
                    <input
                      type="number"
                      value={selectedElement.y}
                      onChange={(e) =>
                        handleUpdateElement({ ...selectedElement, y: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Width</label>
                    <input
                      type="number"
                      min={5}
                      value={selectedElement.width}
                      onChange={(e) =>
                        handleUpdateElement({ ...selectedElement, width: parseInt(e.target.value, 10) || 10 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                    />
                  </div>
                  {selectedElement.type !== "text" && (
                    <div>
                      <label className="text-slate-400 block mb-1">Height</label>
                      <input
                        type="number"
                        min={5}
                        value={selectedElement.height || 100}
                        onChange={(e) =>
                          handleUpdateElement({ ...selectedElement, height: parseInt(e.target.value, 10) || 10 })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Rotation & Opacity */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Rotation (°)</label>
                    <input
                      type="number"
                      value={selectedElement.rotation || 0}
                      onChange={(e) =>
                        handleUpdateElement({ ...selectedElement, rotation: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Opacity</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedElement.opacity !== undefined ? selectedElement.opacity : 1.0}
                      onChange={(e) =>
                        handleUpdateElement({ ...selectedElement, opacity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-500 mt-2"
                    />
                  </div>
                </div>

                {/* Text Specific Controls */}
                {selectedElement.type === "text" && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div>
                      <label className="text-slate-400 block mb-1">Text Content</label>
                      <textarea
                        rows={2}
                        value={selectedElement.text || ""}
                        onChange={(e) => handleUpdateElement({ ...selectedElement, text: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Font Family</label>
                      <select
                        value={selectedElement.fontFamily || "Roboto"}
                        onChange={(e) =>
                          handleUpdateElement({ ...selectedElement, fontFamily: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                      >
                        {fontsList.map((f) => (
                          <option key={f.family} value={f.family}>
                            {f.family}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Font Size</label>
                        <input
                          type="number"
                          min={8}
                          max={200}
                          value={selectedElement.fontSize || 24}
                          onChange={(e) =>
                            handleUpdateElement({ ...selectedElement, fontSize: parseInt(e.target.value, 10) || 12 })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Weight</label>
                        <select
                          value={selectedElement.fontWeight || 400}
                          onChange={(e) =>
                            handleUpdateElement({
                              ...selectedElement,
                              fontWeight: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                        >
                          <option value={400}>Regular (400)</option>
                          <option value={700}>Bold (700)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Text Color</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={selectedElement.fill || "#000000"}
                            onChange={(e) => handleUpdateElement({ ...selectedElement, fill: e.target.value })}
                            className="h-7 w-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                          />
                          <span className="text-[11px] font-mono">{selectedElement.fill || "#000000"}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Alignment</label>
                        <select
                          value={selectedElement.align || "left"}
                          onChange={(e) => handleUpdateElement({ ...selectedElement, align: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shape Specific Controls */}
                {selectedElement.type === "shape" && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div>
                      <label className="text-slate-400 block mb-1">Fill Color</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={selectedElement.fill || "#6366F1"}
                          onChange={(e) => handleUpdateElement({ ...selectedElement, fill: e.target.value })}
                          className="h-7 w-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                        <span className="text-[11px] font-mono">{selectedElement.fill || "#6366F1"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Stroke Color</label>
                        <input
                          type="color"
                          value={selectedElement.stroke || "#000000"}
                          onChange={(e) => handleUpdateElement({ ...selectedElement, stroke: e.target.value })}
                          className="h-7 w-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Stroke Width</label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={selectedElement.strokeWidth || 0}
                          onChange={(e) =>
                            handleUpdateElement({ ...selectedElement, strokeWidth: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                        />
                      </div>
                    </div>

                    {selectedElement.shape === "rect" && (
                      <div>
                        <label className="text-slate-400 block mb-1">Corner Radius</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={selectedElement.cornerRadius || 0}
                          onChange={(e) =>
                            handleUpdateElement({ ...selectedElement, cornerRadius: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Image Specific Controls */}
                {selectedElement.type === "image" && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Image Filters</h3>
                    <div>
                      <label className="text-slate-400 block mb-1">
                        Brightness ({selectedElement.filters?.brightness || 0})
                      </label>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.1}
                        value={selectedElement.filters?.brightness || 0}
                        onChange={(e) =>
                          handleUpdateElement({
                            ...selectedElement,
                            filters: { ...selectedElement.filters, brightness: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">
                        Contrast ({selectedElement.filters?.contrast || 0})
                      </label>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.1}
                        value={selectedElement.filters?.contrast || 0}
                        onChange={(e) =>
                          handleUpdateElement({
                            ...selectedElement,
                            filters: { ...selectedElement.filters, contrast: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">
                        Saturation ({selectedElement.filters?.saturation || 0})
                      </label>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.1}
                        value={selectedElement.filters?.saturation || 0}
                        onChange={(e) =>
                          handleUpdateElement({
                            ...selectedElement,
                            filters: { ...selectedElement.filters, saturation: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedElement.filters?.grayscale)}
                        onChange={(e) =>
                          handleUpdateElement({
                            ...selectedElement,
                            filters: { ...selectedElement.filters, grayscale: e.target.checked },
                          })
                        }
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-slate-300">Grayscale</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Canvas Background & Global Settings */
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4 pb-2 border-b border-slate-800">
                Canvas Settings
              </h2>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Canvas Background</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={canvas.background || "#FFFFFF"}
                      onChange={(e) => {
                        const nextCanvas = { ...canvas, background: e.target.value };
                        setCanvas(nextCanvas);
                        triggerAutosave(nextCanvas);
                      }}
                      className="h-7 w-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="text-[11px] font-mono">{canvas.background}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Width (px)</label>
                    <input
                      type="number"
                      readOnly
                      value={canvas.width}
                      className="w-full bg-slate-800/50 border border-slate-800 rounded px-2.5 py-1 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Height (px)</label>
                    <input
                      type="number"
                      readOnly
                      value={canvas.height}
                      className="w-full bg-slate-800/50 border border-slate-800 rounded px-2.5 py-1 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Export Modal / Status Popup */}
      {exportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Export Design</span>
              <button
                onClick={() => setExportModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </h2>

            <div className="space-y-4 mb-6 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    disabled={exporting}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm"
                  >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPEG (Photo)</option>
                    <option value="pdf">PDF (Document)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Scale</label>
                  <select
                    value={exportScale}
                    onChange={(e) => setExportScale(parseInt(e.target.value, 10))}
                    disabled={exporting}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm"
                  >
                    <option value={1}>1x ({canvas.width} × {canvas.height})</option>
                    <option value={2}>2x ({canvas.width * 2} × {canvas.height * 2})</option>
                  </select>
                </div>
              </div>

              {/* Status Display */}
              {exportJob && (
                <div className="rounded-xl bg-slate-850 border border-slate-800 p-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400">Job Status</span>
                    <span className={`font-semibold uppercase tracking-wider ${
                      exportJob.status === "done"
                        ? "text-green-400"
                        : exportJob.status === "failed"
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}>
                      {exportJob.status}
                    </span>
                  </div>

                  {exportJob.status === "processing" && (
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Loader2 className="animate-spin text-indigo-400" size={14} />
                      <span>Pillow rendering in progress...</span>
                    </div>
                  )}

                  {exportJob.status === "done" && exportJob.downloadUrl && (
                    <a
                      href={exportJob.downloadUrl}
                      download={`export.${exportFormat}`}
                      className="mt-3 flex items-center justify-center space-x-2 w-full rounded-lg bg-green-600 hover:bg-green-500 py-2 font-semibold text-white transition text-xs shadow-lg shadow-green-600/20"
                    >
                      <Download size={14} />
                      <span>Download {exportFormat.toUpperCase()}</span>
                    </a>
                  )}

                  {exportJob.status === "failed" && (
                    <p className="mt-2 text-xs text-red-400">
                      {exportJob.error || "Rendering failed"}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setExportModal(false)}
                className="rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-white transition"
              >
                Close
              </button>
              {(!exportJob || exportJob.status !== "done") && (
                <button
                  type="button"
                  onClick={triggerExport}
                  disabled={exporting}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {exporting && <Loader2 className="animate-spin" size={12} />}
                  <span>{exporting ? "Rendering..." : "Generate Export"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
