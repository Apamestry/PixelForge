"use client";

import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { computeDropPosition, computeCenterPosition, createNewElement } from "@/lib/dropPosition";
import { editorReducer, initialEditorState } from "@/lib/editorState";
import { computeSnapping } from "@/lib/snapping";
import { computeZoomToFit, stepZoom, calculateWheelZoom } from "@/lib/zoomMath";
import { loadAndRegisterFonts } from "@/lib/fontLoader";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { ContextualToolbar } from "@/components/editor/ContextualToolbar";
import { ExportModal } from "@/components/editor/ExportModal";
import { Button, Modal, useToast } from "@/components/ui";
import {
  ArrowLeft,
  Download,
  Loader2,
  Undo2,
  Redo2,
  Minus,
  Plus,
  Maximize2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// Dynamically import EditorCanvas with ssr: false
const EditorCanvas = dynamic(() => import("@/components/EditorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#E9EDF2]">
      <Loader2 className="animate-spin text-accent" size={28} strokeWidth={1.75} />
    </div>
  ),
});

export default function EditorPage() {
  const { id: projectId } = useParams();
  const router = useRouter();
  const { addToast } = useToast();

  const [editorState, dispatch] = useReducer(editorReducer, initialEditorState);
  const { canvas, selectedId, history } = editorState;

  const [project, setProject] = useState(null);
  const [assetUrls, setAssetUrls] = useState({});
  const [userAssets, setUserAssets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [fontsList, setFontsList] = useState([]);
  const [saveStatus, setSaveStatus] = useState("All changes saved"); // "Saving..." | "All changes saved" | "Not saved, retry"
  const [scaleFactor, setScaleFactor] = useState(1.0);

  // Left Sidebar State
  const [activeTab, setActiveTab] = useState("elements");
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  // Export State
  const [exportModal, setExportModal] = useState(false);

  // Rename state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const workspaceRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const isInitialLoadedRef = useRef(false);

  // Snapping guides during drag
  const [snapGuides, setSnapGuides] = useState([]);

  // 1. Initial Load: Project + Asset URLs + Fonts + Templates + User Assets
  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, fontsRes, assetsRes, tplRes] = await Promise.all([
          apiFetch(`/api/projects/${projectId}`),
          apiFetch("/fonts/list"),
          apiFetch("/api/assets"),
          apiFetch("/api/templates"),
        ]);

        if (projRes.status === 404) {
          router.replace("/projects");
          return;
        }

        if (projRes.ok) {
          const data = await projRes.json();
          setProject(data);
          setTitleInput(data.name || "Untitled design");
          dispatch({ type: "SET_CANVAS", payload: data.canvas });
          setAssetUrls(data.assetUrls || {});
          isInitialLoadedRef.current = true;
        }

        if (fontsRes.ok) {
          const fonts = await fontsRes.json();
          setFontsList(fonts);
          loadAndRegisterFonts(fonts);
        }

        if (assetsRes.ok) {
          const assets = await assetsRes.json();
          setUserAssets(assets);
        }

        if (tplRes.ok) {
          const tpls = await tplRes.json();
          setTemplates(tpls);
        }
      } catch (err) {
        console.error("Failed to load editor data", err);
      }
    }
    loadData();
  }, [projectId, router]);

  // Zoom to fit helper
  const handleZoomToFit = useCallback(() => {
    if (!canvas || !workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const fitScale = computeZoomToFit(canvas.width, canvas.height, rect.width, rect.height, 48);
    setScaleFactor(fitScale);
  }, [canvas]);

  // Open at "fit" on initial load
  useEffect(() => {
    if (isInitialLoadedRef.current && canvas) {
      const timer = setTimeout(() => {
        handleZoomToFit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [canvas, handleZoomToFit]);

  // Ctrl/Cmd + wheel zoom on workspace
  useEffect(() => {
    const container = workspaceRef.current;
    if (!container) return;

    function handleWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScaleFactor((prev) => calculateWheelZoom(prev, e.deltaY));
      }
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Save Project
  const saveProject = useCallback(
    async (canvasToSave = canvas, nameToSave = project?.name) => {
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
          setSaveStatus("All changes saved");
        } else {
          setSaveStatus("Not saved, retry");
        }
      } catch (err) {
        console.error("Save failed", err);
        setSaveStatus("Not saved, retry");
      }
    },
    [canvas, project?.name, projectId]
  );

  // Autosave after 3 seconds idle
  const triggerAutosave = useCallback(
    (newCanvas) => {
      setSaveStatus("Saving...");
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        saveProject(newCanvas, project?.name);
      }, 3000);
    },
    [saveProject, project?.name]
  );

  // Trigger autosave when canvas updates
  useEffect(() => {
    if (!isInitialLoadedRef.current || !canvas) return;
    triggerAutosave(canvas);
  }, [canvas, triggerAutosave]);

  // Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore shortcuts while user is typing in an input/textarea/contenteditable
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

      const isMod = e.metaKey || e.ctrlKey;

      // Delete / Backspace -> delete selected element
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        dispatch({ type: "DELETE_ELEMENT" });
        return;
      }

      // Cmd/Ctrl + Z -> Undo (Shift variant -> Redo)
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }

      // Cmd/Ctrl + Shift + Z OR Cmd/Ctrl + Y -> Redo
      if ((isMod && e.key === "z" && e.shiftKey) || (isMod && e.key === "y")) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      // Cmd/Ctrl + D -> Duplicate
      if (isMod && e.key === "d" && selectedId) {
        e.preventDefault();
        dispatch({ type: "DUPLICATE_ELEMENT" });
        return;
      }

      // Escape -> Deselect
      if (e.key === "Escape") {
        dispatch({ type: "SELECT_ELEMENT", payload: null });
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, dispatch]);

  // beforeunload guard - warn if there are unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (saveStatus === "Saving..." || saveStatus === "Not saved, retry") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  // Snapping on drag-move handler (passed to EditorCanvas)
  const handleDragMoveElement = useCallback(
    (e) => {
      if (!canvas) return;
      const node = e.target;
      const dragging = {
        id: node.id(),
        x: node.x(),
        y: node.y(),
        width: node.width ? node.width() : 100,
        height: node.height ? node.height() : 100,
      };

      const others = canvas.elements
        .filter((el) => el.id !== dragging.id)
        .map((el) => ({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width || 100,
          height: el.height || el.width || 100,
        }));

      const { x, y, guides } = computeSnapping(
        dragging,
        others,
        canvas.width,
        canvas.height
      );

      node.x(x);
      node.y(y);
      setSnapGuides(guides);
    },
    [canvas]
  );

  // Clear snap guides on drag end (called from EditorCanvas)
  const handleDragEndClearGuides = useCallback(() => {
    setSnapGuides([]);
  }, []);

  // Handle title rename submit
  async function handleTitleSave() {
    setIsEditingTitle(false);
    const newName = titleInput.trim() || "Untitled design";
    setTitleInput(newName);
    setProject((prev) => (prev ? { ...prev, name: newName } : prev));
    await saveProject(canvas, newName);
  }

  // Element actions
  function handleAddText(options = {}) {
    if (!canvas) return;
    const width = options.width || 400;
    const { x, y } = computeCenterPosition(width, 80, canvas.width, canvas.height);
    const newEl = createNewElement("text", {
      ...options,
      x,
      y,
      width,
      fontFamily: fontsList[0]?.family || "Roboto",
    });
    dispatch({ type: "ADD_ELEMENT", payload: newEl });
  }

  function handleAddShape(shapeType) {
    if (!canvas) return;
    const width = shapeType === "rect" ? 250 : 200;
    const height = shapeType === "rect" ? 180 : 200;
    const { x, y } = computeCenterPosition(width, height, canvas.width, canvas.height);
    const newEl = createNewElement("shape", {
      shape: shapeType,
      x,
      y,
      width,
      height,
    });
    dispatch({ type: "ADD_ELEMENT", payload: newEl });
  }

  function handleAddImage(asset) {
    if (!canvas) return;
    const width = Math.min(400, asset.width || 400);
    const height = Math.min(400, asset.height || 400);
    const { x, y } = computeCenterPosition(width, height, canvas.width, canvas.height);
    const newEl = createNewElement("image", {
      assetId: asset.id,
      x,
      y,
      width,
      height,
    });
    setAssetUrls((prev) => ({ ...prev, [asset.id]: asset.url }));
    dispatch({ type: "ADD_ELEMENT", payload: newEl });
  }

  function handleDropElement(payload, pointerPosition) {
    if (!canvas) return;
    const width = payload.width || (payload.type === "text" ? 400 : 250);
    const height = payload.height || (payload.type === "shape" ? 180 : 200);
    const { x, y } = computeDropPosition(
      pointerPosition,
      scaleFactor,
      width,
      height,
      canvas.width,
      canvas.height
    );

    if (payload.type === "image" && payload.assetUrl && payload.assetId) {
      setAssetUrls((prev) => ({ ...prev, [payload.assetId]: payload.assetUrl }));
    }

    const newEl = createNewElement(payload.type, {
      ...payload,
      x,
      y,
      width,
      height,
      fontFamily: payload.type === "text" ? fontsList[0]?.family || "Roboto" : undefined,
    });

    dispatch({ type: "ADD_ELEMENT", payload: newEl });
  }

  // Upload Asset
  async function handleAssetUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast("File is larger than 10MB limit", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingAsset(true);
    try {
      const res = await apiFetch("/api/assets", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newAsset = await res.json();
        setUserAssets((prev) => [newAsset, ...prev]);
        handleAddImage(newAsset);
        addToast("Image uploaded", "success");
      } else {
        addToast("Failed to upload image", "error");
      }
    } catch {
      addToast("Upload error", "error");
    } finally {
      setUploadingAsset(false);
      e.target.value = "";
    }
  }

  // Delete Asset
  async function handleDeleteAsset(assetId) {
    try {
      const res = await apiFetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (res.ok) {
        setUserAssets((prev) => prev.filter((a) => a.id !== assetId));
        addToast("Asset removed", "info");
      }
    } catch {
      addToast("Failed to delete asset", "error");
    }
  }

  // Confirm Apply Template
  function handleConfirmApplyTemplate() {
    if (!pendingTemplate) return;
    dispatch({ type: "SET_CANVAS", payload: pendingTemplate.canvas });
    setPendingTemplate(null);
    addToast("Template applied", "success");
  }


  if (!project || !canvas) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <Loader2 className="animate-spin text-accent" size={28} strokeWidth={1.75} />
      </div>
    );
  }

  const selectedElement = canvas.elements.find((el) => el.id === selectedId);

  return (
    <div className="flex h-screen flex-col bg-white text-text select-none overflow-hidden font-sans">
      {/* 1. Top Header Bar */}
      <header className="h-14 border-b border-border bg-white px-4 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            href="/projects"
            className="p-1.5 rounded text-text-muted hover:text-text hover:bg-slate-100 transition"
            title="Back to projects"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </Link>

          {/* Design Name (click to rename) */}
          <div className="flex items-center min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setTitleInput(project.name || "Untitled design");
                    setIsEditingTitle(false);
                  }
                }}
                className="rounded border border-accent bg-white px-2 py-0.5 text-sm font-semibold text-text focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-semibold text-text hover:bg-slate-100 px-2 py-1 rounded transition truncate max-w-[220px]"
                title="Click to rename design"
              >
                {project.name || "Untitled design"}
              </button>
            )}
          </div>

          {/* Save Status */}
          <div className="flex items-center space-x-1.5 text-xs text-text-muted pl-2 border-l border-border">
            {saveStatus === "Saving..." && (
              <>
                <Loader2 size={12} strokeWidth={1.75} className="animate-spin text-accent" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "All changes saved" && (
              <>
                <CheckCircle2 size={12} strokeWidth={1.75} className="text-green-600" />
                <span className="text-text-muted">All changes saved</span>
              </>
            )}
            {saveStatus === "Not saved, retry" && (
              <button
                type="button"
                onClick={() => saveProject(canvas, project.name)}
                className="flex items-center space-x-1 text-danger hover:underline font-medium"
              >
                <AlertCircle size={12} strokeWidth={1.75} />
                <span>Not saved, retry</span>
              </button>
            )}
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center space-x-0.5 pl-2 border-l border-border">
            <button
              type="button"
              onClick={() => dispatch({ type: "UNDO" })}
              disabled={history.past.length === 0}
              className="p-1.5 rounded text-text-muted hover:text-text hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
              title="Undo (Ctrl/Cmd+Z)"
            >
              <Undo2 size={16} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "REDO" })}
              disabled={history.future.length === 0}
              className="p-1.5 rounded text-text-muted hover:text-text hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
              title="Redo (Ctrl/Cmd+Y / Shift+Z)"
            >
              <Redo2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Top Right: Export button */}
        <div className="flex items-center space-x-3">
          <Button variant="primary" size="sm" onClick={() => setExportModal(true)}>
            <Download size={14} strokeWidth={1.75} className="mr-1.5" />
            <span>Export</span>
          </Button>
        </div>
      </header>

      {/* 2. Main Editor Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Icon Rail + 300px Panel */}
        <EditorSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          templates={templates}
          userAssets={userAssets}
          canvas={canvas}
          selectedId={selectedId}
          onSelectElement={(id) => dispatch({ type: "SELECT_ELEMENT", payload: id })}
          onAddText={handleAddText}
          onAddShape={handleAddShape}
          onAddImage={handleAddImage}
          onApplyTemplate={(tpl) => setPendingTemplate(tpl)}
          onUploadAsset={handleAssetUpload}
          onDeleteAsset={handleDeleteAsset}
          onReorderElement={(direction, id) =>
            dispatch({
              type: "REORDER_ELEMENT",
              payload: { id: id || selectedId, direction },
            })
          }
          onDeleteElement={(id) => dispatch({ type: "DELETE_ELEMENT", payload: id })}
          uploadingAsset={uploadingAsset}
        />

        {/* Center Workspace + Contextual Toolbar */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#E9EDF2] overflow-hidden relative">
          {/* Contextual Toolbar above artboard */}
          <ContextualToolbar
            selectedElement={selectedElement}
            canvas={canvas}
            fontsList={fontsList}
            onUpdateElement={(updated, coalesce) =>
              dispatch({ type: "UPDATE_ELEMENT", payload: updated, coalesce })
            }
            onDuplicateElement={() => dispatch({ type: "DUPLICATE_ELEMENT" })}
            onDeleteElement={() => dispatch({ type: "DELETE_ELEMENT" })}
            onReorderElement={(direction) =>
              dispatch({ type: "REORDER_ELEMENT", payload: { id: selectedId, direction } })
            }
            onSetBackground={(color) =>
              dispatch({ type: "SET_CANVAS_BACKGROUND", payload: color })
            }
            onSetCanvasSize={({ width, height }) =>
              dispatch({ type: "SET_CANVAS_SIZE", payload: { width, height } })
            }
          />

          {/* Centered Workspace Artboard */}
          <div ref={workspaceRef} className="flex-1 overflow-auto relative">
            <EditorCanvas
              canvas={canvas}
              assetUrls={assetUrls}
              selectedId={selectedId}
              snapGuides={snapGuides}
              onSelectElement={(id) => dispatch({ type: "SELECT_ELEMENT", payload: id })}
              onUpdateElement={(updated) => dispatch({ type: "UPDATE_ELEMENT", payload: updated })}
              onDropElement={handleDropElement}
              onDragMoveElement={handleDragMoveElement}
              onDragEndClearGuides={handleDragEndClearGuides}
              stageScale={scaleFactor}
            />

            {/* Bottom Right Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center space-x-1 rounded border border-border bg-white px-2 py-1 shadow-sm text-xs font-medium text-text select-none">
              <button
                type="button"
                onClick={() => setScaleFactor((prev) => stepZoom(prev, "out"))}
                className="p-1 rounded text-text-muted hover:text-text hover:bg-slate-100 transition"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <Minus size={13} strokeWidth={1.75} />
              </button>

              <span className="font-mono text-xs w-12 text-center">
                {Math.round(scaleFactor * 100)}%
              </span>

              <button
                type="button"
                onClick={() => setScaleFactor((prev) => stepZoom(prev, "in"))}
                className="p-1 rounded text-text-muted hover:text-text hover:bg-slate-100 transition"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <Plus size={13} strokeWidth={1.75} />
              </button>

              <div className="h-3 w-px bg-border mx-1" />

              <button
                type="button"
                onClick={handleZoomToFit}
                className="px-1.5 py-0.5 rounded text-[11px] text-text-muted hover:text-text hover:bg-slate-100 transition flex items-center space-x-1"
                title="Fit artboard to screen"
              >
                <Maximize2 size={11} strokeWidth={1.75} />
                <span>Fit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Template Apply Modal */}
      <Modal
        isOpen={Boolean(pendingTemplate)}
        onClose={() => setPendingTemplate(null)}
        title="Apply template"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPendingTemplate(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmApplyTemplate}>
              Apply template
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          Applying this template will replace your current artboard. Unsaved changes to this design
          will be overwritten.
        </p>
      </Modal>

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        projectId={projectId}
        canvas={canvas}
        onSaveProject={() => saveProject(canvas, project?.name)}
      />
    </div>
  );
}
