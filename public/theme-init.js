(() => {
  try {
    var k = 'gcm-theme';
    var stored = localStorage.getItem(k);
    var theme = (stored === 'light' || stored === 'dark')
      ? stored
      : 'light';
    var root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  } catch {}
})();
