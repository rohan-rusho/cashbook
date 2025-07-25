// js/i18n.js
// Internationalization system for English/Bengali support

import { saveToLocalStorage, getFromLocalStorage } from './utils.js';

let currentLanguage = getFromLocalStorage('language', 'en');
let translations = {};

// Language configuration
const languages = {
    'en': 'English',
    'bn': 'বাংলা'
};

// Load translations
async function loadTranslations(lang) {
    try {
        const response = await fetch(`lang/${lang}.js`);
        if (!response.ok) {
            throw new Error(`Failed to load language file: ${lang}`);
        }
        const module = await import(`../lang/${lang}.js`);
        translations = module.default || module;
        return translations;
    } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to English if loading fails
        if (lang !== 'en') {
            return loadTranslations('en');
        }
        return {};
    }
}

// Set current language
export function setLanguage(lang) {
    if (languages[lang]) {
        currentLanguage = lang;
        saveToLocalStorage('language', lang);
        updateLanguageDisplay();
        return true;
    }
    return false;
}

// Get current language
export function getCurrentLanguage() {
    return currentLanguage;
}

// Get translation for a key
export function translate(key, fallback = '') {
    return translations[key] || fallback || key;
}

// Update all elements with translation keys
export function updateLanguageDisplay() {
    // Update elements with data-key attributes
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.getAttribute('data-key');
        const translation = translate(key);

        if (element.tagName === 'INPUT' && element.type === 'text' || element.type === 'email' || element.type === 'password') {
            element.placeholder = translation;
        } else {
            element.textContent = translation;
        }
    });

    // Update language toggle button - only if not already handled by utils.js
    const langToggle = document.getElementById('langToggle');
    if (langToggle && !langToggle.textContent.includes('🌐')) {
        langToggle.textContent = `🌐 ${languages[currentLanguage]}`;
    }

    // Update select options
    updateSelectOptions();
}

// Update select option translations
function updateSelectOptions() {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        const options = select.querySelectorAll('option');
        options.forEach(option => {
            const key = option.getAttribute('data-key');
            if (key) {
                option.textContent = translate(key);
            }
        });
    });
}

// Initialize language system
export async function initLanguage() {
    await loadTranslations(currentLanguage);
    updateLanguageDisplay();
    setupLanguageToggle();
}

// Setup language toggle functionality
function setupLanguageToggle() {
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = currentLanguage === 'en' ? 'bn' : 'en';
            changeLanguage(newLang);
        });
    }
}

// Change language and reload translations
export async function changeLanguage(lang) {
    if (setLanguage(lang)) {
        await loadTranslations(lang);
        updateLanguageDisplay();

        // Dispatch language change event
        const event = new CustomEvent('languageChanged', {
            detail: { language: lang }
        });
        document.dispatchEvent(event);
    }
}

// Format numbers according to current language
export function formatNumber(number, options = {}) {
    const locale = currentLanguage === 'bn' ? 'bn-BD' : 'en-IN';
    return new Intl.NumberFormat(locale, options).format(number);
}

// Format dates according to current language
export function formatDate(date, options = {}) {
    const locale = currentLanguage === 'bn' ? 'bn-BD' : 'en-IN';
    return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}

// Format currency according to current language
export function formatCurrency(amount, currency = 'INR') {
    const locale = currentLanguage === 'bn' ? 'bn-BD' : 'en-IN';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Get month names in current language
export function getMonthNames() {
    const locale = currentLanguage === 'bn' ? 'bn-BD' : 'en-IN';
    const months = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(2024, i, 1);
        months.push(new Intl.DateTimeFormat(locale, { month: 'long' }).format(date));
    }
    return months;
}

// Get day names in current language
export function getDayNames() {
    const locale = currentLanguage === 'bn' ? 'bn-BD' : 'en-IN';
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(2024, 0, i + 1); // January 1-7, 2024 starts with Monday
        days.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date));
    }
    return days;
}

// Legacy support for old translation system
window.setLang = changeLanguage;
window.translate = translate;

// Export for use in other modules
export { languages, translations };
