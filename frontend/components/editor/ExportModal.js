"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Modal, Button } from "@/components/ui";
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileImage,
  FileText,
  RotateCw,
} from "lucide-react";

const FORMAT_LABELS = {
  png: "PNG (lossless)",
  jpeg: "JPEG (photo)",
  pdf: "PDF (document)",
};

const FORMAT_ICONS = {
  png: FileImage,
  jpeg: FileImage,
  pdf: FileText,
};

function StatusBadge({ status }) {
  const styles = {
    queued: "bg-amber-50 text-amber-700 border-amber-200",
    processing: "bg-blue-50 text-blue-700 border-blue-200",
    done: "bg-green-50 text-green-700 border-green-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
        styles[status] || styles.queued
      }`}
    >
      {status === "processing" && (
        <Loader2 size={10} strokeWidth={2} className="animate-spin mr-1" />
      )}
      {status === "done" && <CheckCircle2 size={10} strokeWidth={2} className="mr-1" />}
      {status === "failed" && <AlertCircle size={10} strokeWidth={2} className="mr-1" />}
      {status === "queued" && <Clock size={10} strokeWidth={2} className="mr-1" />}
      {status}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExportModal({
  isOpen,
  onClose,
  projectId,
  canvas,
  onSaveProject,
}) {
  const [activeTab, setActiveTab] = useState("export"); // "export" | "history"
  const [exportFormat, setExportFormat] = useState("png");
  const [exportScale, setExportScale] = useState(1);
  const [exportJob, setExportJob] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [pastExports, setPastExports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const pollRef = useRef(null);

  const loadPastExports = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await apiFetch("/api/exports");
      if (res.ok) {
        const exports = await res.json();
        // Filter to only this project's exports
        const projectExports = exports.filter((e) => e.project_id === projectId);
        setPastExports(projectExports);
      }
    } catch {
      // Silently fail - history is non-blocking
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId]);

  // Load past exports when modal opens
  useEffect(() => {
    if (!isOpen) return;
    loadPastExports();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isOpen, loadPastExports]);

  const startPolling = useCallback(
    (jobId) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await apiFetch(`/api/exports/${jobId}`);
          if (pollRes.ok) {
            const updated = await pollRes.json();
            setExportJob(updated);
            if (updated.status === "done" || updated.status === "failed") {
              clearInterval(pollRef.current);
              pollRef.current = null;
              setExporting(false);
              loadPastExports();
            }
          }
        } catch {
          // Keep polling on network errors
        }
      }, 2000);
    },
    [loadPastExports]
  );

  async function triggerExport() {
    setExporting(true);
    setExportJob(null);

    try {
      if (onSaveProject) {
        await onSaveProject();
      }

      const res = await apiFetch("/api/exports", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          format: exportFormat,
          scale: parseInt(exportScale, 10),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to queue export job");
      }

      const job = await res.json();
      setExportJob(job);
      startPolling(job.id);
    } catch (err) {
      setExporting(false);
      setExportJob({
        status: "failed",
        error: err.message || "Failed to start export. Please try again.",
      });
    }
  }

  // Request fresh signed download URL when clicking download
  async function handleDownloadItem(jobId, fallbackUrl, format) {
    setDownloadingId(jobId);
    try {
      const res = await apiFetch(`/api/exports/${jobId}`);
      if (res.ok) {
        const freshJob = await res.json();
        const url = freshJob.downloadUrl || fallbackUrl;
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.download = `export-${jobId.slice(0, 8)}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }
    } catch {
      // Fallback to existing url if fresh request fails
      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank");
      }
    } finally {
      setDownloadingId(null);
    }
  }

  function handleClose() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setExportJob(null);
    setExporting(false);
    onClose();
  }

  if (!canvas) return null;

  const FormatIcon = FORMAT_ICONS[exportFormat] || FileImage;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export design"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Close
          </Button>
          {activeTab === "export" && (!exportJob || exportJob.status === "failed") && (
            <Button
              variant="primary"
              size="sm"
              loading={exporting}
              onClick={triggerExport}
            >
              <Download size={13} strokeWidth={1.75} className="mr-1.5" />
              Generate export
            </Button>
          )}
          {activeTab === "export" && exportJob && exportJob.status === "failed" && (
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              onClick={triggerExport}
            >
              <RotateCw size={13} strokeWidth={1.75} className="mr-1.5" />
              Retry export
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Tabs: Export vs Past Exports */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition ${
              activeTab === "export"
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            New export
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              loadPastExports();
            }}
            className={`pb-2 px-3 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === "history"
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <span>Past exports</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-text-muted">
              {pastExports.length}
            </span>
          </button>
        </div>

        {activeTab === "export" ? (
          <div className="space-y-4">
            {/* Format & Scale selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text mb-1">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  disabled={exporting}
                  className="w-full rounded border border-border bg-white px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                >
                  <option value="png">{FORMAT_LABELS.png}</option>
                  <option value="jpeg">{FORMAT_LABELS.jpeg}</option>
                  <option value="pdf">{FORMAT_LABELS.pdf}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Scale</label>
                <select
                  value={exportScale}
                  onChange={(e) => setExportScale(parseInt(e.target.value, 10))}
                  disabled={exporting}
                  className="w-full rounded border border-border bg-white px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                >
                  <option value={1}>
                    1× ({canvas.width} × {canvas.height})
                  </option>
                  <option value={2}>
                    2× ({canvas.width * 2} × {canvas.height * 2})
                  </option>
                </select>
              </div>
            </div>

            {/* Output dimensions summary */}
            <div className="flex items-center space-x-2 px-3 py-2 rounded bg-slate-50 border border-border text-[11px] text-text-muted">
              <FormatIcon size={14} strokeWidth={1.5} className="text-text-muted flex-shrink-0" />
              <span>
                Output:{" "}
                <span className="font-mono font-medium text-text">
                  {canvas.width * exportScale} × {canvas.height * exportScale}px
                </span>{" "}
                {exportFormat.toUpperCase()}
              </span>
            </div>

            {/* Current Job Flow */}
            {exportJob && (
              <div className="rounded border border-border bg-slate-50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-[11px] font-medium">Export status</span>
                  <StatusBadge status={exportJob.status} />
                </div>

                {(exportJob.status === "queued" || exportJob.status === "processing") && (
                  <div className="flex items-center space-x-2 text-text-muted py-1">
                    <Loader2 size={13} strokeWidth={1.75} className="animate-spin text-accent" />
                    <span>
                      {exportJob.status === "queued"
                        ? "Job queued, waiting for renderer..."
                        : "Processing canvas render..."}
                    </span>
                  </div>
                )}

                {exportJob.status === "done" && (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadItem(
                          exportJob.id,
                          exportJob.downloadUrl,
                          exportJob.format || exportFormat
                        )
                      }
                      disabled={downloadingId === exportJob.id}
                      className="flex items-center justify-center space-x-1.5 w-full rounded bg-accent hover:bg-accent-hover py-2 font-medium text-white transition text-xs shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {downloadingId === exportJob.id ? (
                        <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                      ) : (
                        <Download size={14} strokeWidth={1.75} />
                      )}
                      <span>Download {exportFormat.toUpperCase()}</span>
                    </button>
                  </div>
                )}

                {exportJob.status === "failed" && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-danger font-medium">
                      {exportJob.error || "Rendering failed"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Past Exports Tab */
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] text-text-muted">
                Previous exports for this project
              </span>
              <button
                type="button"
                onClick={loadPastExports}
                className="text-[11px] text-accent hover:underline flex items-center space-x-1"
              >
                <RotateCw
                  size={10}
                  strokeWidth={2}
                  className={loadingHistory ? "animate-spin" : ""}
                />
                <span>Refresh</span>
              </button>
            </div>

            {loadingHistory && pastExports.length === 0 ? (
              <div className="flex justify-center py-6 text-text-muted">
                <Loader2 size={16} strokeWidth={2} className="animate-spin text-accent" />
              </div>
            ) : pastExports.length === 0 ? (
              <div className="text-center py-6 text-text-muted border border-dashed border-border rounded">
                No past exports found for this design
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {pastExports.map((exp) => {
                  const ExpIcon = FORMAT_ICONS[exp.format] || FileImage;
                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between rounded border border-border bg-white px-3 py-2 text-[11px]"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <ExpIcon
                          size={14}
                          strokeWidth={1.5}
                          className="text-text-muted flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-medium text-text uppercase">
                              {exp.format}
                            </span>
                            <span className="text-text-muted">
                              {exp.scale || 1}×
                            </span>
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {formatDate(exp.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <StatusBadge status={exp.status} />
                        {exp.status === "done" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadItem(exp.id, exp.downloadUrl, exp.format)
                            }
                            disabled={downloadingId === exp.id}
                            className="p-1 rounded text-accent hover:bg-slate-100 transition disabled:opacity-50"
                            title="Download export"
                          >
                            {downloadingId === exp.id ? (
                              <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                            ) : (
                              <Download size={13} strokeWidth={2} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
