export const THEME_STORAGE_KEY = "playground:theme";

/** Render-blocking inline script for <head>: applies the theme class before
 * first paint. Stored "light"/"dark" wins; otherwise follow the system,
 * falling back to dark. Lives outside any "use client" module so the server
 * layout receives the actual string. */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t}catch(e){}})();`;