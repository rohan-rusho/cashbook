// js/utils.js
// Utility functions for date, formatting, validation, etc.

// Date formatting functions
export function formatDate(date) {
    return new Date(date).toISOString().slice(0, 10);
}

export function formatDateDisplay(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function getCurrentDate() {
    return new Date().toISOString().slice(0, 10);
}

export function getStartOfMonth(date = new Date()) {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
}

export function getEndOfMonth(date = new Date()) {
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return end;
}

export function getDaysInMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getWeekStart(date = new Date()) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

export function getWeekEnd(date = new Date()) {
    const end = new Date(date);
    const day = end.getDay();
    const diff = end.getDate() - day + 6;
    end.setDate(diff);
    end.setHours(23, 59, 59, 999);
    return end;
}

// Currency management
export const CURRENCIES = {
    'BDT': { symbol: '৳', name: 'Bangladeshi Taka', locale: 'en-BD' },
    'INR': { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
    'USD': { symbol: '$', name: 'US Dollar', locale: 'en-US' },
    'EUR': { symbol: '€', name: 'Euro', locale: 'en-EU' },
    'GBP': { symbol: '£', name: 'British Pound', locale: 'en-GB' },
    'JPY': { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
    'CNY': { symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
    'KRW': { symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
    'SGD': { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
    'MYR': { symbol: 'RM', name: 'Malaysian Ringgit', locale: 'en-MY' },
    'THB': { symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
    'PKR': { symbol: 'Rs', name: 'Pakistani Rupee', locale: 'en-PK' },
    'LKR': { symbol: 'Rs', name: 'Sri Lankan Rupee', locale: 'en-LK' },
    'NPR': { symbol: 'Rs', name: 'Nepalese Rupee', locale: 'en-NP' },
    'AFN': { symbol: 'Af', name: 'Afghan Afghani', locale: 'en-AF' }
};

export function getCurrency() {
    return localStorage.getItem('currency') || 'BDT';
}

export function setCurrency(currency) {
    if (CURRENCIES[currency]) {
        localStorage.setItem('currency', currency);
        return true;
    }
    return false;
}

export function getCurrencyInfo(currency = null) {
    const curr = currency || getCurrency();
    return CURRENCIES[curr] || CURRENCIES['BDT'];
}

// Amount formatting functions
export function formatAmount(amt, currency = null) {
    const amount = parseFloat(amt) || 0;

    // Use the original taka sign (৳) for consistency
    const takaSign = '৳';

    const formattedAmount = Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Add negative sign if needed
    const sign = amount < 0 ? '-' : '';

    return `${sign}${takaSign}${formattedAmount}`;
}

// Format amount with proper spacing for lakhs and crores (Indian numbering system)
export function formatAmountWithSpacing(amt, currency = null) {
    try {
        const amount = parseFloat(amt) || 0;

        // Use the original taka sign (৳) with colon and space
        const takaSign = '৳: ';

        // Format with Indian locale
        const formattedAmount = Math.abs(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Add negative sign if needed
        const sign = amount < 0 ? '-' : '';

        const result = `${sign}${takaSign}${formattedAmount}`;
        console.log('formatAmountWithSpacing result:', result);
        return result;
    } catch (error) {
        console.error('Error in formatAmountWithSpacing:', error);
        return `৳${parseFloat(amt).toFixed(2)}`;
    }
}

// Helper function to update balance display with proper formatting
export function updateBalanceDisplay(balance) {
    try {
        const balanceElement = document.getElementById('currentBalance');
        if (balanceElement) {
            const formattedBalance = formatAmountWithSpacing(balance);
            balanceElement.textContent = formattedBalance;
            console.log('Balance updated via helper:', formattedBalance);
        }
    } catch (error) {
        console.error('Error updating balance display:', error);
    }
}

export function parseAmount(amountStr) {
    return parseFloat(amountStr.replace(/[^\d.-]/g, '')) || 0;
}

// Validation functions
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPassword(password) {
    return password.length >= 6;
}

export function isValidMobile(mobile) {
    const mobileRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return mobileRegex.test(mobile);
}

export function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_.]{3,20}$/;
    return usernameRegex.test(username);
}

// UI helper functions
export function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

export function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

export function toggleElement(element) {
    if (element) {
        element.classList.toggle('hidden');
    }
}

export function showLoading(button) {
    const loader = button.querySelector('.loading');
    if (loader) {
        loader.classList.remove('hidden');
    }
    button.disabled = true;
}

export function hideLoading(button) {
    const loader = button.querySelector('.loading');
    if (loader) {
        loader.classList.add('hidden');
    }
    button.disabled = false;
}

export function showMessage(element, message, type = 'info') {
    if (element) {
        element.textContent = message;
        element.className = `alert alert-${type}`;
        showElement(element);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideElement(element);
        }, 5000);
    }
}

export function clearMessage(element) {
    if (element) {
        element.textContent = '';
        element.className = 'alert hidden';
        hideElement(element);
    }
}

// Data processing functions
export function groupTransactionsByDate(transactions) {
    return transactions.reduce((groups, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
    }, {});
}

export function groupTransactionsByCategory(transactions) {
    return transactions.reduce((groups, transaction) => {
        const category = transaction.category || transaction.source || 'Other';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(transaction);
        return groups;
    }, {});
}

export function calculateTotalAmount(transactions) {
    return transactions.reduce((total, transaction) => {
        return total + parseFloat(transaction.amount || 0);
    }, 0);
}

export function filterTransactionsByDateRange(transactions, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= start && transactionDate <= end;
    });
}

export function getDateRange(period) {
    const today = new Date();
    let startDate, endDate;

    switch (period) {
        case '7days':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
            endDate = today;
            break;
        case 'thisMonth':
            startDate = getStartOfMonth(today);
            endDate = getEndOfMonth(today);
            break;
        case 'lastMonth':
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            startDate = getStartOfMonth(lastMonth);
            endDate = getEndOfMonth(lastMonth);
            break;
        default:
            startDate = today;
            endDate = today;
    }

    return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
    };
}

// Category colors for charts
export function getCategoryColor(category) {
    const colors = {
        'food': '#FF6384',
        'transport': '#36A2EB',
        'shopping': '#FFCE56',
        'entertainment': '#4BC0C0',
        'bills': '#9966FF',
        'health': '#FF9F40',
        'education': '#FF6384',
        'travel': '#36A2EB',
        'salary': '#4BC0C0',
        'business': '#9966FF',
        'investment': '#FF9F40',
        'freelance': '#FFCE56',
        'other': '#C9CBCF'
    };
    return colors[category] || colors.other;
}

// Local storage helpers
export function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

export function getFromLocalStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

export function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
}

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export CSV data
export function exportToCSV(data, filename = 'export.csv') {
    const csvContent = "data:text/csv;charset=utf-8," + data;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Error handling
export function handleError(error, fallbackMessage = 'An error occurred') {
    console.error('Error:', error);
    return error.message || fallbackMessage;
}

// Check if user is authenticated
export function isAuthenticated() {
    return !!getCurrentUser();
}

// Get current user from local storage or session
export function getCurrentUser() {
    return getFromLocalStorage('currentUser');
}

// Set current user
export function setCurrentUser(user) {
    saveToLocalStorage('currentUser', user);
}

// Remove current user
export function removeCurrentUser() {
    removeFromLocalStorage('currentUser');
}

// Initialize theme
export function initTheme() {
    const theme = getFromLocalStorage('theme', 'light');
    document.documentElement.setAttribute('data-theme', theme);
}

// Smart suggestions based on spending patterns
export function generateSpendingSuggestions(transactions) {
    const suggestions = [];
    const categories = groupTransactionsByCategory(transactions);

    // Calculate average spending per category
    Object.keys(categories).forEach(category => {
        const categoryTransactions = categories[category];
        const totalAmount = calculateTotalAmount(categoryTransactions);
        const avgAmount = totalAmount / categoryTransactions.length;

        if (avgAmount > 5000) {
            suggestions.push(`You're spending an average of ${formatAmount(avgAmount)} on ${category}. Consider budgeting for this category.`);
        }
    });

    // Check for high spending days
    const transactionsByDate = groupTransactionsByDate(transactions);
    Object.keys(transactionsByDate).forEach(date => {
        const dayTransactions = transactionsByDate[date];
        const dayTotal = calculateTotalAmount(dayTransactions);

        if (dayTotal > 10000) {
            suggestions.push(`High spending day detected on ${formatDateDisplay(date)} - ${formatAmount(dayTotal)}. Review your expenses.`);
        }
    });

    return suggestions;
}

// Initialize mobile menu
export function initMobileMenu() {
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileMenuClose = document.getElementById('mobileMenuClose');

    function openMobileMenu() {
        mobileMenu?.classList.add('active');
        mobileMenuOverlay?.classList.add('active');
    }

    function closeMobileMenu() {
        mobileMenu?.classList.remove('active');
        mobileMenuOverlay?.classList.remove('active');
    }

    // Close modals function
    function closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    mobileMenuButton?.addEventListener('click', openMobileMenu);
    mobileMenuClose?.addEventListener('click', closeMobileMenu);
    mobileMenuOverlay?.addEventListener('click', closeMobileMenu);

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
            closeModals();
        }
    });
}

// Initialize theme toggle
export function initThemeToggle() {
    console.log('🎨 Initializing theme toggle...');

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    console.log('🎨 Current theme:', savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    const themeSwitch = document.getElementById('themeSwitch');
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    const mobileThemeSwitch = document.getElementById('mobileThemeSwitch');

    console.log('🎨 Theme elements found:', {
        themeToggle: !!themeToggle,
        themeSwitch: !!themeSwitch,
        mobileThemeToggle: !!mobileThemeToggle,
        mobileThemeSwitch: !!mobileThemeSwitch
    });

    // Update switch state
    function updateSwitches() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            themeSwitch?.classList.add('active');
            mobileThemeSwitch?.classList.add('active');
        } else {
            themeSwitch?.classList.remove('active');
            mobileThemeSwitch?.classList.remove('active');
        }
        console.log('🎨 Switches updated for theme:', currentTheme);
    }

    // Initial switch state
    updateSwitches();

    // Theme toggle event listeners
    [themeToggle, mobileThemeToggle].forEach(toggle => {
        if (toggle) {
            toggle.setAttribute('data-initialized', 'true');
            toggle.addEventListener('click', () => {
                console.log('🎨 Theme toggle clicked');
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                console.log('🎨 Switching theme:', currentTheme, '→', newTheme);

                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);

                updateSwitches();
            });
        }
    });

    console.log('🎨 Theme toggle initialized successfully');
}

// Initialize logout functionality
export function initLogout() {
    const logoutBtns = document.querySelectorAll('#logoutBtn, #logoutMainBtn, #logoutHeaderBtn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                console.log('🚪 Logout initiated...');

                // Clear all local storage
                localStorage.clear();
                sessionStorage.clear();
                console.log('✅ Local storage cleared');

                // Sign out from Firebase
                await firebase.auth().signOut();
                console.log('✅ Firebase sign out complete');

                // Wait a moment to ensure logout is complete
                await new Promise(resolve => setTimeout(resolve, 500));

                // Force redirect to index page
                window.location.replace('index.html');

            } catch (error) {
                console.error('❌ Logout error:', error);

                // Even if logout fails, clear local data and redirect
                localStorage.clear();
                sessionStorage.clear();

                alert('Logout completed, but there may have been an issue. You have been redirected to the home page.');
                window.location.replace('index.html');
            }
        });
    });
}

// Initialize language toggle
function initLanguageToggle() {
    const langToggleBtns = document.querySelectorAll('#langToggle');
    langToggleBtns.forEach(btn => {
        // Set initial button text
        const currentLang = getFromLocalStorage('language', 'en');
        btn.textContent = currentLang === 'en' ? '🌐 English' : '🌐 বাংলা';

        btn.addEventListener('click', async () => {
            const currentLang = getFromLocalStorage('language', 'en');
            const newLang = currentLang === 'en' ? 'bn' : 'en';

            // Simple localStorage approach
            saveToLocalStorage('language', newLang);
            btn.textContent = newLang === 'en' ? '🌐 English' : '🌐 বাংলা';
            window.location.reload();
        });
    });
}

// Mobile detection and responsive fixes
export function isMobile() {
    return window.innerWidth <= 768;
}

export function initMobileResponsive() {
    function handleMobileView() {
        const desktopActions = document.getElementById('desktopActions');
        const logoutHeaderBtn = document.getElementById('logoutHeaderBtn');
        const themeToggle = document.getElementById('themeToggle');

        if (isMobile()) {
            // Hide desktop actions on mobile
            if (desktopActions) {
                desktopActions.style.display = 'none';
                desktopActions.style.visibility = 'hidden';
                desktopActions.style.opacity = '0';
            }
            if (logoutHeaderBtn) {
                logoutHeaderBtn.style.display = 'none';
            }
            if (themeToggle) {
                themeToggle.style.display = 'none';
            }
        } else {
            // Show desktop actions on desktop
            if (desktopActions) {
                desktopActions.style.display = 'flex';
                desktopActions.style.visibility = 'visible';
                desktopActions.style.opacity = '1';
            }
            if (logoutHeaderBtn) {
                logoutHeaderBtn.style.display = 'block';
            }
            if (themeToggle) {
                themeToggle.style.display = 'flex';
            }
        }
    }

    // Run on page load
    handleMobileView();

    // Run on window resize
    window.addEventListener('resize', handleMobileView);
}

// Auto-initialize mobile responsive fixes
document.addEventListener('DOMContentLoaded', initMobileResponsive);

// Make functions available globally for non-module usage
if (typeof window !== 'undefined') {
    window.initThemeToggle = initThemeToggle;
    window.initMobileMenu = initMobileMenu;
    window.initLogout = initLogout;
    window.initLanguageToggle = initLanguageToggle;
    window.initMobileResponsive = initMobileResponsive;
    window.formatAmount = formatAmount;
    window.formatAmountWithSpacing = formatAmountWithSpacing;
    window.updateBalanceDisplay = updateBalanceDisplay;
    window.formatDate = formatDate;
    window.formatDateDisplay = formatDateDisplay;
    window.getCurrentDate = getCurrentDate;
    window.showMessage = showMessage;
    window.hideLoading = hideLoading;
    window.showLoading = showLoading;
}
