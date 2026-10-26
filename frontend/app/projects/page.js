"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getToken } from "@/lib/api";
import {
  TopBar,
  Button,
  IconButton,
  Input,
  Select,
  Modal,
  Skeleton,
  useToast,
} from "@/components/ui";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  FolderOpen,
  Layout,
  SlidersHorizontal,
} from "lucide-react";

const SIZE_PRESETS = [
  { name: "Instagram post", width: 1080, height: 1080, desc: "1080 × 1080" },
  { name: "Poster", width: 1080, height: 1350, desc: "1080 × 1350" },
  { name: "YouTube thumbnail", width: 1280, height: 720, desc: "1280 × 720" },
  { name: "LinkedIn banner", width: 1584, height: 396, desc: "1584 × 396" },
  { name: "Infographic", width: 800, height: 2000, desc: "800 × 2000" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "name"

  // Custom Size Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("Untitled design");
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customError, setCustomError] = useState("");
  const [creating, setCreating] = useState(false);

  // Card Menu / Action Modals
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [renameProject, setRenameProject] = useState(null); // { id, name }
  const [newProjectName, setNewProjectName] = useState("");
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const menuRef = useRef(null);

  // Auth Guard
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [router]);

  // Click outside to close card menus
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [projRes, tplRes] = await Promise.all([
        apiFetch("/api/projects"),
        apiFetch("/api/templates"),
      ]);

      if (!projRes.ok) throw new Error("Failed to load projects");

      const projData = await projRes.json();
      setProjects(projData);

      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setTemplates(tplData);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  // Create Project from Preset
  async function handleCreatePreset(preset) {
    try {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: `${preset.name} design`,
          width: preset.width,
          height: preset.height,
        }),
      });
      if (res.ok) {
        const newProj = await res.json();
        router.push(`/editor/${newProj.id}`);
      }
    } catch {
      addToast("Failed to create project", "error");
    }
  }

  // Create Project from Template
  async function handleCreateFromTemplate(template) {
    try {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: `${template.name} design`,
          templateId: template.id,
        }),
      });
      if (res.ok) {
        const newProj = await res.json();
        router.push(`/editor/${newProj.id}`);
      }
    } catch {
      addToast("Failed to apply template", "error");
    }
  }

  // Create Custom Size Project
  async function handleCreateCustom(e) {
    e.preventDefault();
    const w = parseInt(customWidth, 10);
    const h = parseInt(customHeight, 10);

    if (isNaN(w) || w < 100 || w > 4000 || isNaN(h) || h < 100 || h > 4000) {
      setCustomError("Width and height must each be between 100 and 4000 pixels.");
      return;
    }

    setCreating(true);
    setCustomError("");
    try {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: customName.trim() || "Untitled design",
          width: w,
          height: h,
        }),
      });

      if (res.ok) {
        const newProj = await res.json();
        setIsCustomModalOpen(false);
        router.push(`/editor/${newProj.id}`);
      }
    } catch {
      setCustomError("Could not create project. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  // Rename Project
  async function handleRenameSubmit(e) {
    e.preventDefault();
    if (!renameProject || !newProjectName.trim()) return;

    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${renameProject.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === renameProject.id ? { ...p, name: newProjectName.trim() } : p))
        );
        addToast("Design renamed", "success");
        setRenameProject(null);
      }
    } catch {
      addToast("Failed to rename design", "error");
    } finally {
      setActionLoading(false);
    }
  }

  // Duplicate Project
  async function handleDuplicateProject(proj) {
    setActiveMenuId(null);
    try {
      // 1. Create project with same dimensions
      const res = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: `${proj.name} (copy)`,
          width: proj.canvas?.width || 1080,
          height: proj.canvas?.height || 1080,
        }),
      });

      if (res.ok) {
        const newProj = await res.json();
        // 2. Snapshot current canvas into duplicate
        if (proj.canvas) {
          await apiFetch(`/api/projects/${newProj.id}`, {
            method: "PUT",
            body: JSON.stringify({ canvas: proj.canvas }),
          });
        }
        setProjects((prev) => [newProj, ...prev]);
        addToast("Design duplicated", "success");
      }
    } catch {
      addToast("Failed to duplicate design", "error");
    }
  }

  // Delete Project
  async function handleDeleteConfirm() {
    if (!deleteProjectId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${deleteProjectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== deleteProjectId));
        addToast("Design deleted", "info");
        setDeleteProjectId(null);
      }
    } catch {
      addToast("Failed to delete design", "error");
    } finally {
      setActionLoading(false);
    }
  }

  // Filter and sort designs
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name?.toLowerCase().includes(q));
    }

    if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      // recent (default)
      result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    return result;
  }, [projects, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <TopBar title="Projects" />

      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 space-y-10">
        {/* Section 1: Create a design */}
        <section aria-labelledby="create-heading" className="space-y-4">
          <div>
            <h1 id="create-heading" className="text-xl font-bold tracking-tight text-text">
              Create a design
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Select a size preset or start from custom dimensions
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleCreatePreset(preset)}
                className="flex flex-col justify-between p-3.5 rounded border border-border bg-white hover:border-accent hover:shadow-sm text-left transition group focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <div>
                  <span className="font-semibold text-xs text-text group-hover:text-accent transition block">
                    {preset.name}
                  </span>
                  <span className="text-[11px] text-text-muted mt-1 block font-mono">
                    {preset.desc}
                  </span>
                </div>
                <div className="mt-4 flex items-center text-[11px] font-medium text-accent">
                  <Plus size={12} strokeWidth={1.75} className="mr-1" />
                  <span>Use preset</span>
                </div>
              </button>
            ))}

            {/* Custom Size button */}
            <button
              type="button"
              onClick={() => {
                setCustomName("Untitled design");
                setCustomWidth(1080);
                setCustomHeight(1080);
                setCustomError("");
                setIsCustomModalOpen(true);
              }}
              className="flex flex-col justify-between p-3.5 rounded border border-dashed border-border bg-white hover:border-accent hover:bg-slate-50 text-left transition group focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <div>
                <span className="font-semibold text-xs text-text group-hover:text-accent transition block">
                  Custom size
                </span>
                <span className="text-[11px] text-text-muted mt-1 block">Up to 4000 × 4000</span>
              </div>
              <div className="mt-4 flex items-center text-[11px] font-medium text-accent">
                <SlidersHorizontal size={12} strokeWidth={1.75} className="mr-1" />
                <span>Set size</span>
              </div>
            </button>
          </div>

          {/* Start from a template row */}
          {templates.length > 0 && (
            <div className="pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Start from a template
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleCreateFromTemplate(tpl)}
                    className="p-3 rounded border border-border bg-white hover:border-accent hover:shadow-sm text-left transition group focus:outline-none focus:ring-2 focus:ring-accent/20 flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs text-text group-hover:text-accent transition block truncate">
                        {tpl.name}
                      </span>
                      <span className="text-[11px] text-text-muted mt-0.5 block font-mono">
                        {tpl.width} × {tpl.height}
                      </span>
                    </div>
                    <span className="mt-3 text-[11px] text-text-muted group-hover:text-accent font-medium">
                      Apply template &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Your designs */}
        <section aria-labelledby="designs-heading" className="space-y-4 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <h2 id="designs-heading" className="text-xl font-bold tracking-tight text-text">
                Your designs
              </h2>
              {!loading && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-text-muted">
                  {filteredProjects.length}
                </span>
              )}
            </div>

            {/* Search and Sort controls */}
            <div className="flex items-center space-x-3">
              <div className="relative w-48 sm:w-60">
                <Search
                  size={15}
                  strokeWidth={1.75}
                  className="absolute left-2.5 top-2.5 text-text-muted pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search designs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded border border-border bg-white pl-8 pr-3 py-1.5 text-xs text-text placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-slate-100 transition"
                />
              </div>

              <div className="w-36">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded border border-border bg-white px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-slate-100 transition"
                  aria-label="Sort designs"
                >
                  <option value="recent">Recently edited</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error State with Retry Button */}
          {error && (
            <div
              role="alert"
              className="rounded border border-red-200 bg-red-50 p-4 text-sm text-danger flex items-center justify-between"
            >
              <span>{error}</span>
              <Button variant="danger" size="sm" onClick={fetchData}>
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded border border-border bg-white p-3 space-y-3">
                  <Skeleton className="h-36 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && projects.length === 0 && (
            <div className="rounded border border-dashed border-border bg-white p-12 text-center max-w-md mx-auto my-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-text-muted mb-3">
                <FolderOpen size={24} strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold text-text">No designs yet</h3>
              <p className="mt-1 text-xs text-text-muted">
                Create your first design using a preset above or start from custom dimensions.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => handleCreatePreset(SIZE_PRESETS[0])}
              >
                Create a design
              </Button>
            </div>
          )}

          {/* No Search Matches */}
          {!loading && !error && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="rounded border border-border bg-white p-8 text-center text-xs text-text-muted">
              No designs found matching &quot;{searchQuery}&quot;.
            </div>
          )}

          {/* Projects Grid */}
          {!loading && !error && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProjects.map((proj) => {
                const canvasW = proj.canvas?.width || 1080;
                const canvasH = proj.canvas?.height || 1080;
                const bg = proj.canvas?.background || "#FFFFFF";
                const isMenuOpen = activeMenuId === proj.id;

                return (
                  <div
                    key={proj.id}
                    className="group relative rounded border border-border bg-white hover:border-slate-300 transition flex flex-col overflow-hidden"
                  >
                    {/* Canvas Aspect Ratio Preview Box */}
                    <Link
                      href={`/editor/${proj.id}`}
                      className="h-40 w-full flex items-center justify-center p-3 bg-slate-50 border-b border-border overflow-hidden"
                    >
                      <div
                        className="max-h-full max-w-full rounded-sm border border-slate-200/80 shadow-sm flex items-center justify-center transition-transform group-hover:scale-[1.02]"
                        style={{
                          aspectRatio: `${canvasW} / ${canvasH}`,
                          backgroundColor: bg,
                          height: canvasH >= canvasW ? "100%" : "auto",
                          width: canvasW > canvasH ? "100%" : "auto",
                        }}
                      >
                        <span className="text-[10px] text-slate-400 font-mono px-1">
                          {canvasW}×{canvasH}
                        </span>
                      </div>
                    </Link>

                    {/* Card Info and Menu */}
                    <div className="p-3 flex items-start justify-between space-x-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/editor/${proj.id}`}
                          className="font-semibold text-xs text-text hover:text-accent transition truncate block"
                          title={proj.name}
                        >
                          {proj.name}
                        </Link>
                        <div className="mt-1 flex items-center space-x-1.5 text-[11px] text-text-muted">
                          <span className="font-mono">
                            {canvasW} × {canvasH}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(proj.updated_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Menu */}
                      <div
                        className="relative"
                        ref={isMenuOpen ? menuRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : proj.id);
                          }}
                          className="p-1 rounded text-text-muted hover:text-text hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-accent/20"
                          aria-label={`Actions for ${proj.name}`}
                        >
                          <MoreVertical size={16} strokeWidth={1.75} />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 mt-1 w-36 rounded border border-border bg-white py-1 shadow-lg z-30 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setRenameProject(proj);
                                setNewProjectName(proj.name);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-text hover:bg-slate-50 transition"
                            >
                              <Edit2 size={13} strokeWidth={1.75} />
                              <span>Rename</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateProject(proj)}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-text hover:bg-slate-50 transition"
                            >
                              <Copy size={13} strokeWidth={1.75} />
                              <span>Duplicate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeleteProjectId(proj.id);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-danger hover:bg-red-50 transition"
                            >
                              <Trash2 size={13} strokeWidth={1.75} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Custom Size Modal */}
      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="Custom size design"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCustomModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={creating}
              onClick={handleCreateCustom}
            >
              Create design
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCustom} className="space-y-4">
          <Input
            label="Design name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="My design"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Width (px)"
              type="number"
              min={100}
              max={4000}
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              helperText="100 to 4000 pixels"
              required
            />
            <Input
              label="Height (px)"
              type="number"
              min={100}
              max={4000}
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              helperText="100 to 4000 pixels"
              required
            />
          </div>

          {customError && (
            <p aria-live="polite" className="text-xs text-danger">
              {customError}
            </p>
          )}
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={Boolean(renameProject)}
        onClose={() => setRenameProject(null)}
        title="Rename design"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRenameProject(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={actionLoading}
              onClick={handleRenameSubmit}
            >
              Save name
            </Button>
          </>
        }
      >
        <form onSubmit={handleRenameSubmit}>
          <Input
            label="Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteProjectId)}
        onClose={() => setDeleteProjectId(null)}
        title="Delete design"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteProjectId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={handleDeleteConfirm}
            >
              Delete design
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          Are you sure you want to delete this design? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
