const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("arcade-theme");
    const theme = stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = theme;
  } catch {}
})();
`;

export function ThemeProvider() {
  return <script id="arcade-theme" dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
