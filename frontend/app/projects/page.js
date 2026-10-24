"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, removeToken } from "@/lib/api";
import { Plus, Trash2, Layout, LogOut, ArrowRight, Image as ImageIcon } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [projectName, setProjectName] = useState("Untitled Design");
  const [blankWidth, setBlankWidth] = useState(1080);
  const [blankHeight, setBlankHeight] = useState(1080);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [projRes, tplRes] = await Promise.all([
        apiFetch("/api/projects"),
        apiFetch("/api/templates"),
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setTemplates(tplData);
      }
    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    setCreating(true);

    try {
      const payload = {
        name: projectName,
      };

      if (selectedTemplateId) {
        payload.templateId = selectedTemplateId;
      } else {
        payload.width = parseInt(blankWidth, 10);
        payload.height = parseInt(blankHeight, 10);
      }

      const res = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newProj = await res.json();
        router.push(`/editor/${newProj.id}`);
      }
    } catch (err) {
      console.error("Failed to create project", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(id, e) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await apiFetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  }

  function handleLogout() {
    removeToken();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/20">
            PF
          </div>
          <span className="text-lg font-bold tracking-tight text-white">PixelForge</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              setProjectName("New Design");
              setSelectedTemplateId("");
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">My Projects</h1>
          <p className="mt-1 text-sm text-slate-400">Design, customize, and export high-resolution assets</p>
        </div>

        {loading ? (
          <div className="flex py-20 items-center justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-12 text-center max-w-xl mx-auto my-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-4">
              <Layout size={28} />
            </div>
            <h2 className="text-lg font-semibold text-white">No projects yet</h2>
            <p className="mt-2 text-sm text-slate-400">
              Create your first project from scratch or pick from one of our pre-designed templates.
            </p>
            <button
              onClick={() => {
                setProjectName("New Design");
                setSelectedTemplateId("");
                setShowCreateModal(true);
              }}
              className="mt-6 inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              <Plus size={16} />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                href={`/editor/${proj.id}`}
                className="group relative rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition flex flex-col"
              >
                {/* Canvas Aspect Ratio Preview Box */}
                <div
                  className="h-44 w-full flex items-center justify-center border-b border-slate-800 p-4"
                  style={{ backgroundColor: proj.canvas?.background || "#1E1E2F" }}
                >
                  <div className="text-xs text-white/50 flex flex-col items-center">
                    <span className="font-semibold text-white/70">{proj.canvas?.width} × {proj.canvas?.height}</span>
                    <span className="text-[11px] mt-0.5">{proj.canvas?.elements?.length || 0} elements</span>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <h2 className="font-semibold text-sm text-white truncate group-hover:text-indigo-400 transition">
                      {proj.name}
                    </h2>
                    <span className="text-xs text-slate-500">
                      {new Date(proj.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                    title="Delete project"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>

            <form onSubmit={handleCreateProject}>
              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="My Awesome Design"
                />
              </div>

              {/* Template Selector */}
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Choose a Starting Template or Blank Canvas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                  {/* Blank Option */}
                  <div
                    onClick={() => setSelectedTemplateId("")}
                    className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition ${
                      selectedTemplateId === ""
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-800 bg-slate-800/50 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white mb-1">Blank Canvas</div>
                      <div className="text-[11px] text-slate-400">{blankWidth} × {blankHeight}</div>
                    </div>
                    <div className="mt-3 text-[10px] text-indigo-400 font-semibold uppercase">Custom</div>
                  </div>

                  {/* Seeded Templates */}
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition ${
                        selectedTemplateId === tpl.id
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-800 bg-slate-800/50 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white mb-1">{tpl.name}</div>
                        <div className="text-[11px] text-slate-400">{tpl.width} × {tpl.height}</div>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-500 font-semibold uppercase">Template</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Dimensions if Blank Selected */}
              {selectedTemplateId === "" && (
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Width (px)</label>
                    <input
                      type="number"
                      min={100}
                      max={4000}
                      value={blankWidth}
                      onChange={(e) => setBlankWidth(e.target.value)}
                      className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-1.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Height (px)</label>
                    <input
                      type="number"
                      min={100}
                      max={4000}
                      value={blankHeight}
                      onChange={(e) => setBlankHeight(e.target.value)}
                      className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-1.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Start Editing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
