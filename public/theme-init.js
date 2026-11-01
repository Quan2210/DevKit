try {
  const theme = localStorage.getItem("devkit:v1:theme") || "system";
  document.documentElement.setAttribute("data-theme", theme);
} catch {
  document.documentElement.setAttribute("data-theme", "system");
}
