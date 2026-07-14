(function initializeTheme() {
  var preference = 'system';
  try {
    var saved = window.localStorage.getItem('app_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      preference = saved;
    }
  } catch (_error) {
    // Storage can be unavailable in restricted browser contexts. System remains safe.
  }

  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var resolvedTheme = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
  var root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.themePreference = preference;
  root.dataset.resolvedTheme = resolvedTheme;

  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', resolvedTheme === 'dark' ? '#121110' : '#fcfaf6');
  }
})();
