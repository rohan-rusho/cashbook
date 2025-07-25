// Universal Theme Initialization Script
// This should be included in the HEAD of every page to prevent theme flashing

(function () {
    // Get saved theme or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';

    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Also set a CSS class for additional styling if needed
    document.documentElement.className = savedTheme + '-theme';

    // Debug log
    console.log('Theme initialized:', savedTheme);
})();
