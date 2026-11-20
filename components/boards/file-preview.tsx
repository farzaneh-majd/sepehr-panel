"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useFileBlob } from "@/context/FileBlobContext";
import { format } from "@/lib/date";
import type { FilePreviewProps } from "@/types/boards";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "mkv"];

export function formatFileSize(size?: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function FilePreview({ file, onClose, onDelete }: FilePreviewProps) {
  const { getBlobUrl, getContentType, preloadFile } = useFileBlob();
  const [attemptedId, setAttemptedId] = useState<number | null>(null);

  const fileId = file?.fileId ?? null;
  const blobUrl = fileId ? getBlobUrl(fileId) : null;
  const contentType = fileId ? getContentType(fileId) ?? "" : "";
  const extension = file?.name.split(".").pop()?.toLowerCase() ?? "";
  const loading = !!fileId && !blobUrl && attemptedId !== fileId;

  useEffect(() => {
    if (!fileId || getBlobUrl(fileId)) return;
    preloadFile(fileId).finally(() => setAttemptedId(fileId));
  }, [fileId, getBlobUrl, preloadFile]);

  const isImage = contentType.startsWith("image/") || IMAGE_EXTENSIONS.includes(extension);
  const isVideo = contentType.startsWith("video/") || VIDEO_EXTENSIONS.includes(extension);
  const isPdf = contentType === "application/pdf" || extension === "pdf";

  const download = () => {
    if (!blobUrl || !file) return;
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = file.name;
    link.click();
  };

  const openInNewTab = () => {
    if (blobUrl) window.open(blobUrl, "_blank", "noopener,noreferrer");
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const renderBody = () => {
    if (loading) {
      return <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-600 border-t-white" />;
    }
    if (blobUrl && isImage) {
      return (
        <img
          src={blobUrl}
          alt={file?.name}
          onClick={stop}
          className="max-h-full max-w-full rounded object-contain shadow-2xl"
        />
      );
    }
    if (blobUrl && isVideo) {
      return <video src={blobUrl} controls onClick={stop} className="max-h-full max-w-full rounded shadow-2xl" />;
    }
    if (blobUrl && isPdf) {
      return <iframe src={blobUrl} title={file?.name} onClick={stop} className="h-full w-full max-w-5xl rounded bg-white" />;
    }
    return (
      <div onClick={stop} className="rounded-lg bg-[#22272b] p-8 text-center sm:min-w-[320px]">
        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-xl bg-gray-700">
          <span className="text-lg font-bold uppercase tracking-wide text-gray-300">{extension || "file"}</span>
        </div>
        <div className="text-sm text-gray-400">
          {blobUrl || !fileId ? "There is no preview available for this attachment." : "Failed to load the file."}
        </div>
      </div>
    );
  };

  const meta = [
    file?.createdAt ? `Added ${format(new Date(file.createdAt), "d MMM yyyy, HH:mm")}` : "",
    formatFileSize(file?.size),
  ].filter(Boolean).join(" • ");

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        onClick={onClose}
        className="flex h-dvh w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black/85 p-0 text-white shadow-none sm:max-w-none top-0 left-0 translate-x-0 translate-y-0 [&>button]:hidden"
      >
        <DialogDescription className="sr-only">File preview</DialogDescription>
        <button
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          onClick={onClose}
          title="Close"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 pt-16 sm:px-16">
          {renderBody()}
        </div>

        <div className="flex flex-col items-center gap-2 px-4 pb-6">
          <DialogTitle onClick={stop} dir="auto" className="max-w-full truncate text-center text-xl font-semibold text-white">
            {file?.name}
          </DialogTitle>
          {meta && <div onClick={stop} className="text-sm text-gray-300">{meta}</div>}
          <div className="flex flex-wrap items-center justify-center gap-1" onClick={stop}>
            <button
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              onClick={openInNewTab}
              disabled={!blobUrl}
            >
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </button>
            <button
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              onClick={download}
              disabled={!blobUrl}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            {onDelete && (
              <button
                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                onClick={onDelete}
              >
                <X className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
