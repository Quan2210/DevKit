// Runs before first paint (loaded synchronously from <head>) so the page never flashes the wrong theme.
// Must read the same format that src/lib/storage.ts writes: a JSON string such as "dark".
try {
  const raw = localStorage.getItem("devkit:v1:theme");
  const value = raw === null ? null : JSON.parse(raw);
  const theme = value === "light" || value === "dark" ? value : "system";
  document.documentElement.setAttribute("data-theme", theme);
} catch {
  document.documentElement.setAttribute("data-theme", "system");
}
