/** Download text as a file through a Blob URL, which is revoked right after the click. */
export function downloadText(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Revoke on the next task so the browser has started the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
