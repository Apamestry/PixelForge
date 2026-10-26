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
  ChevronDown,
  ChevronRight,
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
  const [exportFormat, setExportFormat] = useState("png");
  const [exportScale, setExportScale] = useState(1);
  const [exportJob, setExportJob] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [pastExports, setPastExports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const pollRef = useRef(null);

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
  }, [isOpen]);

  async function loadPastExports() {
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
      // Silently fail - history is a nice-to-have
    } finally {
      setLoadingHistory(false);
    }
  }

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
              // Refresh the history list
              loadPastExports();
            }
          }
        } catch {
          // Keep polling on network errors
        }
      }, 2000);
    },
    []
  );

  async function triggerExport() {
    setExporting(true);
    setExportJob(null);

    try {
      // Save first
      await onSaveProject();

      const res = await apiFetch("/api/exports", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          format: exportFormat,
          scale: parseInt(exportScale, 10),
        }),
      });

      if (!res.ok) throw new Error("Failed to queue export job");

      const job = await res.json();
      setExportJob(job);
      startPolling(job.id);
    } catch {
      setExporting(false);
      setExportJob({ status: "failed", error: "Failed to start export. Please try again." });
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
          {(!exportJob || exportJob.status === "failed") && (
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
        </>
      }
    >
      <div className="space-y-4 text-xs">
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
              <option value="png">PNG (lossless)</option>
              <option value="jpeg">JPEG (photo)</option>
              <option value="pdf">PDF (document)</option>
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

        {/* Output info */}
        <div className="flex items-center space-x-2 px-3 py-2 rounded bg-slate-50 border border-border text-[11px] text-text-muted">
          <FormatIcon size={14} strokeWidth={1.5} className="text-text-muted flex-shrink-0" />
          <span>
            Output: <span className="font-mono font-medium text-text">{canvas.width * exportScale} × {canvas.height * exportScale}px</span>{" "}
            {exportFormat.toUpperCase()}
          </span>
        </div>

        {/* Current Job Status */}
        {exportJob && (
          <div className="rounded border border-border bg-slate-50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-[11px] font-medium">Current export</span>
              <StatusBadge status={exportJob.status} />
            </div>

            {(exportJob.status === "queued" || exportJob.status === "processing") && (
              <div className="flex items-center space-x-2 text-text-muted">
                <Loader2 size={13} strokeWidth={1.75} className="animate-spin text-accent" />
                <span>{exportJob.status === "queued" ? "Queued, waiting..." : "Rendering image..."}</span>
              </div>
            )}

            {exportJob.status === "done" && exportJob.downloadUrl && (
              <a
                href={exportJob.downloadUrl}
                download={`export.${exportFormat}`}
                className="flex items-center justify-center space-x-1.5 w-full rounded bg-accent hover:bg-accent-hover py-2 font-medium text-white transition text-xs shadow-sm"
              >
                <Download size={14} strokeWidth={1.75} />
                <span>Download {exportFormat.toUpperCase()}</span>
              </a>
            )}

            {exportJob.status === "failed" && (
              <p className="text-xs text-danger">{exportJob.error || "Rendering failed"}</p>
            )}
          </div>
        )}

        {/* Past Exports History */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-1.5 text-[11px] font-medium text-text-muted hover:text-text transition w-full text-left"
          >
            {showHistory ? (
              <ChevronDown size={12} strokeWidth={2} />
            ) : (
              <ChevronRight size={12} strokeWidth={2} />
            )}
            <span>Past exports ({pastExports.length})</span>
            {loadingHistory && (
              <Loader2 size={10} strokeWidth={2} className="animate-spin text-accent ml-1" />
            )}
          </button>

          {showHistory && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5">
              {pastExports.length === 0 && !loadingHistory && (
                <p className="text-[11px] text-text-muted py-2 text-center">No previous exports</p>
              )}
              {pastExports.map((exp) => {
                const ExpIcon = FORMAT_ICONS[exp.format] || FileImage;
                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between rounded border border-border bg-white px-3 py-2 text-[11px]"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <ExpIcon size={13} strokeWidth={1.5} className="text-text-muted flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium text-text uppercase">{exp.format}</span>
                        <span className="text-text-muted ml-1.5">
                          {exp.scale || 1}× · {formatDate(exp.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <StatusBadge status={exp.status} />
                      {exp.status === "done" && exp.downloadUrl && (
                        <a
                          href={exp.downloadUrl}
                          download={`export.${exp.format}`}
                          className="p-1 rounded text-accent hover:bg-accent/10 transition"
                          title="Download"
                        >
                          <Download size={12} strokeWidth={2} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
