// js/dashboard.js
// Handles dashboard: live balance, add income/expense, transaction history, filters, daily balance, auto-archive

import {
    formatAmount,
    formatAmountWithSpacing,
    formatDateDisplay,
    getCurrentDate,
    showMessage,
    clearMessage,
    showLoading,
    hideLoading,
    showElement,
    hideElement,
    calculateTotalAmount,
    groupTransactionsByDate,
    getCurrentUser,
    initMobileMenu,
    initThemeToggle,
    initLogout,
    initLanguageToggle
} from './utils.js';

import { translate } from './i18n.js';

// Firebase references
let auth, db, realtimeDB;
let currentUser = null;
let userTransactions = [];
let currentBalance = 0;

// DOM elements
let balanceDisplay, transactionsList, incomeModal, expenseModal;
let incomeForm, expenseForm;
let addIncomeBtn, addExpenseBtn, viewReportsBtn, calendarBtn;

// Initialize Firebase
function initFirebase() {
    if (typeof firebase !== 'undefined') {
        console.log('Dashboard: Firebase detected, initializing...');

        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
            console.log('Dashboard: Firebase initialized');
        } else {
            console.log('Dashboard: Firebase already initialized');
        }

        auth = firebase.auth();
        db = firebase.firestore();
        realtimeDB = firebase.database();

        console.log('Dashboard: Firebase services initialized:', {
            auth: !!auth,
            firestore: !!db,
            realtimeDB: !!realtimeDB
        });
    } else {
        console.error('Dashboard: Firebase not loaded');
    }
}

// Initialize dashboard
export function initDashboard() {
    console.log('🏠 Initializing dashboard...');
    initFirebase();
    initDOMElements();
    initEventListeners();

    // Wait for authentication
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('✅ User authenticated, loading dashboard data...');
            currentUser = user;
            loadUserData();
            loadTransactions();
        } else {
            console.log('❌ User not authenticated, redirecting to login...');
            // Only redirect if not on login page
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Initialize DOM elements
function initDOMElements() {
    console.log('Initializing DOM elements...');

    balanceDisplay = document.getElementById('currentBalance');
    transactionsList = document.getElementById('transactionsList');
    incomeModal = document.getElementById('incomeModal');
    expenseModal = document.getElementById('expenseModal');
    incomeForm = document.getElementById('incomeForm');
    expenseForm = document.getElementById('expenseForm');
    addIncomeBtn = document.getElementById('addIncomeBtn');
    addExpenseBtn = document.getElementById('addExpenseBtn');
    viewReportsBtn = document.getElementById('viewReportsBtn');
    calendarBtn = document.getElementById('calendarBtn');

    console.log('DOM elements found:', {
        balanceDisplay: !!balanceDisplay,
        transactionsList: !!transactionsList,
        incomeModal: !!incomeModal,
        expenseModal: !!expenseModal,
        incomeForm: !!incomeForm,
        expenseForm: !!expenseForm,
        addIncomeBtn: !!addIncomeBtn,
        addExpenseBtn: !!addExpenseBtn,
        viewReportsBtn: !!viewReportsBtn,
        calendarBtn: !!calendarBtn
    });
}

// Initialize event listeners
function initEventListeners() {
    console.log('Setting up event listeners...');

    // Quick action buttons
    if (addIncomeBtn) {
        addIncomeBtn.addEventListener('click', () => {
            console.log('Income button clicked');
            showModal('income');
        });
        console.log('Income button listener added');
    } else {
        console.log('Income button not found');
    }

    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', () => {
            console.log('Expense button clicked');
            showModal('expense');
        });
        console.log('Expense button listener added');
    } else {
        console.log('Expense button not found');
    }

    if (viewReportsBtn) {
        viewReportsBtn.addEventListener('click', () => {
            console.log('Reports button clicked');
            window.location.href = 'report.html';
        });
        console.log('Reports button listener added');
    }

    if (calendarBtn) {
        calendarBtn.addEventListener('click', () => {
            console.log('Calendar button clicked');
            toggleCalendar();
        });
        console.log('Calendar button listener added');
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close, [id*="cancel"]').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Form submissions
    if (incomeForm) {
        incomeForm.addEventListener('submit', handleIncomeSubmit);
    }

    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshTransactions');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadTransactions);
    }

    // Modal overlay clicks
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// Load user data
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const welcomeText = document.getElementById('welcomeText');
            if (welcomeText) {
                welcomeText.textContent = `Welcome back, ${userData.fullName || currentUser.displayName}!`;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load transactions
async function loadTransactions() {
    try {
        const transactionsQuery = db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .orderBy('date', 'desc')
            .limit(50);

        const snapshot = await transactionsQuery.get();
        userTransactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        calculateBalance();
        displayTransactions();

    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Calculate balance
function calculateBalance() {
    const income = userTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expenses = userTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    currentBalance = income - expenses;

    if (balanceDisplay) {
        // Direct formatting function that always works
        const formatBalanceDirectly = (amount) => {
            const formattedNumber = Math.abs(amount).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            const sign = amount < 0 ? '-' : '';
            return `${sign}৳: ${formattedNumber}`;
        };

        try {
            const formattedAmount = formatBalanceDirectly(currentBalance);
            balanceDisplay.textContent = formattedAmount;
            console.log('Dashboard balance updated:', formattedAmount);
        } catch (error) {
            console.log('Error formatting balance:', error);
            // Ultimate fallback
            balanceDisplay.textContent = `৳${currentBalance.toFixed(2)}`;
        }

        // Update balance card color based on amount
        const balanceCard = document.querySelector('.balance-card');
        if (balanceCard) {
            balanceCard.classList.remove('negative', 'zero');

            if (currentBalance < 0) {
                balanceCard.classList.add('negative');
            } else if (currentBalance === 0) {
                balanceCard.classList.add('zero');
            }
            // If positive, keep default blue gradient (no class needed)
        }
    }
}

// Display transactions
function displayTransactions() {
    if (!transactionsList) return;

    if (userTransactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="text-center text-secondary" data-key="noTransactions">
                No transactions yet
            </div>
        `;
        return;
    }

    const transactionsHTML = userTransactions.slice(0, 10).map(transaction => {
        const isIncome = transaction.type === 'income';
        const amountClass = isIncome ? 'text-success' : 'text-error';
        const icon = isIncome ? '💰' : '💸';
        const sign = isIncome ? '+' : '-';

        return `
            <div class="transaction-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border);">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-size: 1.5rem;">${icon}</span>
                    <div>
                        <div style="font-weight: 500;">${transaction.source || transaction.category}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${formatDateDisplay(transaction.date)}</div>
                        ${transaction.note ? `<div style="font-size: 0.875rem; color: var(--text-secondary);">${transaction.note}</div>` : ''}
                    </div>
                </div>
                <div class="${amountClass}" style="font-weight: 600;">
                    ${sign}${formatAmount(transaction.amount)}
                </div>
            </div>
        `;
    }).join('');

    transactionsList.innerHTML = transactionsHTML;
}

// Show modal
function showModal(type) {
    console.log(`showModal called with type: ${type}`);

    const modal = type === 'income' ? incomeModal : expenseModal;
    const form = type === 'income' ? incomeForm : expenseForm;

    console.log('Modal element:', modal);
    console.log('Form element:', form);

    if (modal && form) {
        // Set today's date
        const dateInput = form.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = getCurrentDate();
        }

        showElement(modal);
        modal.classList.add('fade-in');
        console.log('Modal should be visible now');

        // Focus first input
        const firstInput = form.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
    } else {
        console.log('Modal or form not found');
    }
}

// Close modals
function closeModals() {
    [incomeModal, expenseModal].forEach(modal => {
        if (modal) {
            hideElement(modal);
            modal.classList.remove('fade-in');
        }
    });

    // Reset forms
    [incomeForm, expenseForm].forEach(form => {
        if (form) {
            form.reset();
        }
    });
}

// Handle income form submission
async function handleIncomeSubmit(e) {
    e.preventDefault();
    console.log('Income form submitted');

    const submitBtn = incomeForm.querySelector('button[type="submit"]');
    const amount = document.getElementById('incomeAmount').value;
    const source = document.getElementById('incomeSource').value;
    const date = document.getElementById('incomeDate').value;
    const note = document.getElementById('incomeNote').value;

    console.log('Income form data:', { amount, source, date, note });

    if (!amount || !source || !date) {
        console.error('Missing required fields');
        alert('Please fill in all required fields');
        return;
    }

    try {
        showLoading(submitBtn);

        const transaction = {
            type: 'income',
            amount: parseFloat(amount),
            source,
            date,
            note: note || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('Saving income transaction:', transaction);

        // Save to Firestore
        const docRef = await db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .add(transaction);

        console.log('Income transaction saved to Firestore with ID:', docRef.id);

        // Also save to Realtime Database for backup
        try {
            const realtimeTransaction = {
                ...transaction,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            await realtimeDB.ref(`users/${currentUser.uid}/transactions/${docRef.id}`).set(realtimeTransaction);
            console.log('Income transaction saved to Realtime Database');
        } catch (realtimeError) {
            console.error('Error saving to Realtime Database:', realtimeError);
        }

        alert('Income added successfully!');
        closeModals();
        loadTransactions();

    } catch (error) {
        console.error('Error adding income:', error);
        alert('Error adding income. Please try again.');
    } finally {
        hideLoading(submitBtn);
    }
}

// Handle expense form submission
async function handleExpenseSubmit(e) {
    e.preventDefault();
    console.log('Expense form submitted');

    const submitBtn = expenseForm.querySelector('button[type="submit"]');
    const amount = document.getElementById('expenseAmount').value;
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;
    const note = document.getElementById('expenseNote').value;

    console.log('Expense form data:', { amount, category, date, note });

    if (!amount || !category || !date) {
        console.error('Missing required fields');
        alert('Please fill in all required fields');
        return;
    }

    try {
        showLoading(submitBtn);

        const transaction = {
            type: 'expense',
            amount: parseFloat(amount),
            category,
            date,
            note: note || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('Saving expense transaction:', transaction);

        // Save to Firestore
        const docRef = await db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .add(transaction);

        console.log('Expense transaction saved to Firestore with ID:', docRef.id);

        // Also save to Realtime Database for backup
        try {
            const realtimeTransaction = {
                ...transaction,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            await realtimeDB.ref(`users/${currentUser.uid}/transactions/${docRef.id}`).set(realtimeTransaction);
            console.log('Expense transaction saved to Realtime Database');
        } catch (realtimeError) {
            console.error('Error saving to Realtime Database:', realtimeError);
        }

        alert('Expense added successfully!');
        closeModals();
        loadTransactions();

    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Error adding expense. Please try again.');
    } finally {
        hideLoading(submitBtn);
    }
}

// Toggle calendar view
function toggleCalendar() {
    const calendarSection = document.getElementById('calendarSection');
    if (calendarSection) {
        calendarSection.classList.toggle('hidden');
    }
}

// Module is now initialized from HTML with proper ES6 imports
