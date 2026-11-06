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

// Custom frame colours (src/lib/appearance.ts): the saved file already holds the final values, so this only
// assigns them. It checks names and values the way parseStored does, so nothing odd in storage can reach the page.
try {
  const stored = localStorage.getItem("devkit:v1:appearance");
  const appearance = stored === null ? null : JSON.parse(stored);
  const attrs = [
    "data-ap-page",
    "data-ap-nav",
    "data-ap-nav-solid",
    "data-ap-panel-header",
    "data-ap-status",
  ];
  if (appearance && appearance.v === 1 && appearance.vars && Array.isArray(appearance.attrs)) {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(appearance.vars)) {
      if (/^--ap-[a-z-]+-[ld]$/.test(name) && /^#[0-9a-f]{6}$/i.test(value)) {
        root.style.setProperty(name, value);
      }
    }
    for (const name of appearance.attrs) {
      if (attrs.includes(name)) root.setAttribute(name, "");
    }
  }
} catch {
  // No saved colours, or storage is blocked: the default look.
}
