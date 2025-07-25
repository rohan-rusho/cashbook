// js/report.js
// Handles reports: pie/bar/line charts, filters, export (CSV, PDF, JSON), top categories

if (!window.firebase?.apps?.length && window.firebaseConfig) {
    firebase.initializeApp(window.firebaseConfig || firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let filteredTransactions = []; // Store filtered transactions for export

function getDateRange(range, startDate, endDate) {
    const now = new Date();
    let from, to;

    switch (range) {
        case '7days':
            from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            to = now;
            break;
        case 'thisMonth':
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'lastMonth':
            from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            to = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'custom':
            from = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            to = endDate ? new Date(endDate) : now;
            break;
        default:
            from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            to = now;
    }

    console.log('📅 Date range:', { from, to, range });
    return { from, to };
}

async function loadReport(user) {
    try {
        console.log('📊 Loading report data for user:', user.uid);
        console.log('📊 Firebase db object:', db);

        // Show loading state first
        showLoadingState();

        // Get filter values
        const dateRange = document.getElementById('dateRange')?.value || '7days';
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;

        const { from, to } = getDateRange(dateRange, startDate, endDate);

        // First try to get all transactions for the user from the correct collection
        console.log('📊 Querying transactions from user subcollection...');
        console.log('📊 Query path:', `users/${user.uid}/transactions`);

        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('transactions')
            .get();

        console.log('📊 Found', snapshot.size, 'total transactions in user subcollection');

        if (snapshot.empty) {
            console.log('📊 No transactions found in subcollection, trying main collection...');
            // Fallback: try the main transactions collection
            const mainSnapshot = await db.collection('transactions')
                .where('userId', '==', user.uid)
                .get();

            console.log('📊 Found', mainSnapshot.size, 'transactions in main collection');

            if (mainSnapshot.empty) {
                console.log('📊 No transactions found anywhere');
                showNoDataState();
                return;
            } else {
                // Use main collection data
                processTransactions(mainSnapshot, from, to);
            }
        } else {
            // Use subcollection data
            processTransactions(snapshot, from, to);
        }

    } catch (error) {
        console.error('❌ Error loading report:', error);
        console.error('❌ Error details:', error.message, error.stack);

        // Show more specific error message
        let errorMessage = 'Failed to load report data. ';
        if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please check your login status.';
        } else if (error.code === 'unavailable') {
            errorMessage += 'Database temporarily unavailable. Please try again.';
        } else {
            errorMessage += 'Please try again or contact support.';
        }

        showErrorState(errorMessage);
    }
}

function processTransactions(snapshot, from, to) {
    console.log('📊 Processing transactions, snapshot size:', snapshot.size);
    const allTransactions = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log('📊 Raw transaction data:', data);

        // Convert timestamp to date for consistency
        let transactionDate;
        if (data.timestamp && data.timestamp.toDate) {
            transactionDate = data.timestamp.toDate();
        } else if (data.date) {
            if (data.date instanceof Date) {
                transactionDate = data.date;
            } else {
                transactionDate = new Date(data.date);
            }
        } else {
            transactionDate = new Date();
        }

        // Parse amount more carefully
        let amount = 0;
        if (typeof data.amount === 'number') {
            amount = data.amount;
        } else if (typeof data.amount === 'string') {
            amount = parseFloat(data.amount.replace(/[^\d.-]/g, '')) || 0;
        } else {
            console.warn('📊 Invalid amount format:', data.amount);
        }

        const transaction = {
            id: doc.id,
            amount: Math.abs(amount), // Ensure positive amount
            type: data.type || 'expense',
            category: data.source || data.category || 'Other',
            source: data.source || data.category || 'Other',
            note: data.note || '',
            date: transactionDate.toLocaleDateString('en-US'),
            timestamp: transactionDate
        };

        console.log('📊 Processed transaction:', transaction);
        allTransactions.push(transaction);
    });

    console.log('📊 All processed transactions:', allTransactions);

    // Sort transactions by date (newest first)
    allTransactions.sort((a, b) => b.timestamp - a.timestamp);

    // Filter by date range with more flexible comparison
    const transactions = allTransactions.filter(transaction => {
        const txDate = new Date(transaction.timestamp);
        const fromDate = new Date(from);
        const toDate = new Date(to);

        // Reset time components for proper date comparison
        txDate.setHours(0, 0, 0, 0);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        return txDate >= fromDate && txDate <= toDate;
    });

    filteredTransactions = transactions; // Store for export

    console.log('📊 Filtered transactions:', transactions.length, 'from', allTransactions.length, 'total');
    console.log('📊 Date range:', { from, to });
    console.log('📊 Final transaction details:', transactions);

    if (transactions.length === 0 && allTransactions.length > 0) {
        console.log('📊 No transactions found in date range, showing all transactions instead');
        // If no transactions in range, show recent transactions instead
        const recentTransactions = allTransactions.slice(0, 20);
        renderCharts(recentTransactions);
        renderTopCategories(recentTransactions);
        renderTransactionList(recentTransactions);
        updateSummaryCards(recentTransactions);
    } else if (transactions.length > 0) {
        renderCharts(transactions);
        renderTopCategories(transactions);
        renderTransactionList(transactions);
        updateSummaryCards(transactions);
    } else {
        console.log('📊 No transactions found anywhere');
        showNoDataState();
    }
}

function showLoadingState() {
    // Update summary cards with loading spinners
    const summaryCards = document.querySelectorAll('#totalIncome, #totalExpenses, #netSavings');
    summaryCards.forEach(card => {
        card.innerHTML = '<span class="loading-spinner"></span>';
    });

    // Update top categories
    const topCategoriesList = document.getElementById('topCategoriesList');
    if (topCategoriesList) {
        topCategoriesList.innerHTML = '<div class="text-center"><span class="loading-spinner"></span> Loading...</div>';
    }

    // Update transactions table
    const transactionsTable = document.getElementById('transactionsTable');
    if (transactionsTable) {
        transactionsTable.innerHTML = '<tr><td colspan="5" class="text-center"><span class="loading-spinner"></span> Loading transactions...</td></tr>';
    }
}

function showNoDataState() {
    // Update summary cards
    const summaryCards = document.querySelectorAll('#totalIncome, #totalExpenses, #netSavings');
    summaryCards.forEach(card => {
        card.textContent = '৳0.00';
    });

    // Update top categories
    const topCategoriesList = document.getElementById('topCategoriesList');
    if (topCategoriesList) {
        topCategoriesList.innerHTML = `
            <div class="text-center text-secondary">
                <p>No transactions found.</p>
                <p><a href="dashboard.html" class="btn btn-primary">Add transactions</a> to see your report.</p>
                <p><button onclick="createSampleData()" class="btn btn-secondary">Add Sample Data</button></p>
            </div>
        `;
    }

    // Update transactions table
    const transactionsTable = document.getElementById('transactionsTable');
    if (transactionsTable) {
        transactionsTable.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No transactions found. <a href="dashboard.html">Add transactions</a> to see your report.</td></tr>';
    }

    console.log('📊 No data to display');
}

// Add sample data for testing
async function createSampleData() {
    try {
        const currentUser = window.currentUser || auth.currentUser;
        if (!currentUser) {
            alert('Please log in first');
            return;
        }

        console.log('📊 Creating sample data...');

        const sampleTransactions = [
            { type: 'expense', amount: 500, source: 'Food', note: 'Lunch at restaurant', date: new Date() },
            { type: 'expense', amount: 1200, source: 'Transport', note: 'Monthly bus pass', date: new Date(Date.now() - 1000 * 60 * 60 * 24) },
            { type: 'income', amount: 5000, source: 'Salary', note: 'Monthly salary', date: new Date(Date.now() - 1000 * 60 * 60 * 48) },
            { type: 'expense', amount: 800, source: 'Shopping', note: 'Groceries', date: new Date(Date.now() - 1000 * 60 * 60 * 72) },
            { type: 'expense', amount: 300, source: 'Entertainment', note: 'Movie tickets', date: new Date(Date.now() - 1000 * 60 * 60 * 96) }
        ];

        const userTransactionsCollection = db.collection('users').doc(currentUser.uid).collection('transactions');

        for (const transaction of sampleTransactions) {
            await userTransactionsCollection.add({
                ...transaction,
                userId: currentUser.uid,
                timestamp: firebase.firestore.Timestamp.fromDate(transaction.date)
            });
        }

        console.log('📊 Sample data created successfully');
        alert('Sample data added! Refreshing report...');

        // Reload the report
        loadReport(currentUser);

    } catch (error) {
        console.error('❌ Error creating sample data:', error);
        alert('Error creating sample data: ' + error.message);
    }
}

function updateSummaryCards(txs) {
    console.log('📊 Updating summary cards with', txs.length, 'transactions');
    console.log('📊 Transactions to process:', txs);

    // Calculate totals using parseFloat for consistency with dashboard
    const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => {
        const amount = parseFloat(t.amount) || 0;
        console.log('📊 Income transaction:', t.amount, '->', amount);
        return sum + amount;
    }, 0);

    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => {
        const amount = parseFloat(t.amount) || 0;
        console.log('📊 Expense transaction:', t.amount, '->', amount);
        return sum + amount;
    }, 0);

    const netSavings = totalIncome - totalExpenses;

    console.log('📊 Summary calculations:', { totalIncome, totalExpenses, netSavings });

    // Update summary cards in the DOM with proper currency symbol
    const incomeEl = document.getElementById('totalIncome');
    const expensesEl = document.getElementById('totalExpenses');
    const savingsEl = document.getElementById('netSavings');

    console.log('📊 Summary elements found:', {
        incomeEl: !!incomeEl,
        expensesEl: !!expensesEl,
        savingsEl: !!savingsEl
    });

    if (incomeEl) {
        const formatted = `৳${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        incomeEl.textContent = formatted;
        console.log('📊 Updated income element:', formatted);
    } else {
        console.error('totalIncome element not found');
    }

    if (expensesEl) {
        const formatted = `৳${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        expensesEl.textContent = formatted;
        console.log('📊 Updated expenses element:', formatted);
    } else {
        console.error('totalExpenses element not found');
    }

    if (savingsEl) {
        const formatted = `৳${netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        savingsEl.textContent = formatted;
        console.log('📊 Updated savings element:', formatted);
    } else {
        console.error('netSavings element not found');
    }

    // Debug log for totals
    console.log('📊 Report totals updated:', { totalIncome, totalExpenses, netSavings, txs: txs.length });
}

function showErrorState(message) {
    const summaryCards = document.querySelectorAll('#totalIncome, #totalExpenses, #netSavings');
    summaryCards.forEach(card => {
        card.textContent = 'Error';
        card.style.color = '#ef4444';
    });

    const topCategoriesList = document.getElementById('topCategoriesList');
    if (topCategoriesList) {
        topCategoriesList.innerHTML = `<div class="text-center text-error">${message}</div>`;
    }

    const transactionsTable = document.getElementById('transactionsTable');
    if (transactionsTable) {
        transactionsTable.innerHTML = `<tr><td colspan="5" class="text-center text-error">${message}</td></tr>`;
    }
}

function renderCharts(txs) {
    // Use Chart.js for better charts
    if (typeof Chart !== 'undefined') {
        console.log('📊 Using Chart.js for rendering charts');
        const reportData = {
            totalIncome: txs.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
            totalExpenses: txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
            transactions: txs
        };
        reportData.balance = reportData.totalIncome - reportData.totalExpenses;

        // Render pie chart for expense categories
        renderExpensesPieChart(txs);

        // Render line chart for daily trends
        renderDailyTrendsChart(txs);

        // Render bar chart for monthly comparison
        renderMonthlyBarChart(txs);
    } else {
        console.log('📊 Chart.js not available, using basic rendering');
        renderBasicCharts(txs);
    }
}

function renderExpensesPieChart(transactions) {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;

    // Process expense categories
    const categoryTotals = {};
    transactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            const category = transaction.category || transaction.source || 'Other';
            categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(transaction.amount);
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (labels.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }

    // Destroy existing chart
    if (window.pieChartInstance) {
        window.pieChartInstance.destroy();
    }

    // Color palette
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
        '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'
    ];

    window.pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ৳${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderDailyTrendsChart(transactions) {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    // Process daily data
    const dailyData = {};
    transactions.forEach(transaction => {
        const date = transaction.date;
        if (!dailyData[date]) {
            dailyData[date] = { income: 0, expense: 0 };
        }

        if (transaction.type === 'income') {
            dailyData[date].income += transaction.amount;
        } else {
            dailyData[date].expense += Math.abs(transaction.amount);
        }
    });

    const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const incomeData = sortedDates.map(date => dailyData[date].income);
    const expenseData = sortedDates.map(date => dailyData[date].expense);

    // Destroy existing chart
    if (window.lineChartInstance) {
        window.lineChartInstance.destroy();
    }

    window.lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return `${label}: ৳${value.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '৳' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function renderMonthlyBarChart(transactions) {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    // Process monthly data
    const monthlyData = {};
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expense: 0 };
        }

        if (transaction.type === 'income') {
            monthlyData[monthKey].income += transaction.amount;
        } else {
            monthlyData[monthKey].expense += Math.abs(transaction.amount);
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(year, monthNum - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const incomeData = sortedMonths.map(month => monthlyData[month].income);
    const expenseData = sortedMonths.map(month => monthlyData[month].expense);

    // Destroy existing chart
    if (window.barChartInstance) {
        window.barChartInstance.destroy();
    }

    window.barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: '#22c55e',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return `${label}: ৳${value.toLocaleString()}`;
                        },
                        afterLabel: function (context) {
                            const dataIndex = context.dataIndex;
                            const income = incomeData[dataIndex] || 0;
                            const expense = expenseData[dataIndex] || 0;
                            const net = income - expense;
                            return `Net: ৳${net.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '৳' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function renderBasicCharts(txs) {
    // Fallback basic chart rendering
    console.log('📊 Rendering basic charts for', txs.length, 'transactions');
}

function renderTopCategories(txs) {
    const topCategoriesList = document.getElementById('topCategoriesList');
    if (!topCategoriesList) {
        console.warn('topCategoriesList element not found');
        return;
    }

    // Process expense categories
    const categoryTotals = {};
    txs.forEach(transaction => {
        if (transaction.type === 'expense') {
            const category = transaction.category || transaction.source || 'Other';
            categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(transaction.amount);
        }
    });

    // Sort and get top 3
    const topCategories = Object.entries(categoryTotals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    if (topCategories.length === 0) {
        topCategoriesList.innerHTML = '<div class="text-center text-secondary">No expense categories found</div>';
        return;
    }

    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const categoryIcons = {
        'food': '🍽️',
        'transport': '🚗',
        'shopping': '🛍️',
        'education': '📚',
        'entertainment': '🎬',
        'bills': '💡',
        'utilities': '🏠',
        'rent': '🏡',
        'other': '📦',
        'salary': '💰',
        'freelance': '💼',
        'bonus': '🎉'
    };

    const categoriesHTML = topCategories.map((cat, index) => {
        const icon = categoryIcons[cat.category.toLowerCase()] || '📊';
        const percentage = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : '0.0';

        return `
            <div class="category-card" style="min-width: 200px; margin: 0.5rem;">
                <div class="card" style="text-align: center; padding: 1rem;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">${icon}</div>
                    <h4 style="margin: 0.5rem 0; text-transform: capitalize;">${cat.category}</h4>
                    <p style="color: #ef4444; font-weight: 600; margin: 0.25rem 0;">৳${cat.amount.toFixed(2)}</p>
                    <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">${percentage}% of expenses</p>
                </div>
            </div>
        `;
    }).join('');

    topCategoriesList.innerHTML = categoriesHTML;
}

function renderTransactionList(txs) {
    const tableBody = document.getElementById('transactionsTable');
    if (!tableBody) {
        console.warn('transactionsTable element not found');
        return;
    }

    tableBody.innerHTML = '';

    if (txs.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="text-center text-secondary">No transactions found</td>
        `;
        tableBody.appendChild(row);
        return;
    }

    txs.forEach(transaction => {
        const row = document.createElement('tr');
        const isIncome = transaction.type === 'income';
        const amount = Math.abs(transaction.amount);

        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>
                <span class="badge ${isIncome ? 'badge-success' : 'badge-error'}">
                    ${isIncome ? 'Income' : 'Expense'}
                </span>
            </td>
            <td>${transaction.category}</td>
            <td style="color: ${isIncome ? '#10b981' : '#ef4444'}; font-weight: 600;">
                ${isIncome ? '+' : '-'}৳${amount.toFixed(2)}
            </td>
            <td>${transaction.note || '-'}</td>
        `;

        tableBody.appendChild(row);
    });
}

// Export functions
function exportToCSV() {
    if (filteredTransactions.length === 0) {
        alert('No data to export. Please load some transactions first.');
        return;
    }
    const csvContent = generateCSVContent(filteredTransactions);
    const csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const a = document.createElement('a');
    a.href = csv;
    a.download = 'transactions.csv';
    a.click();
}

function exportToJSON() {
    if (filteredTransactions.length === 0) {
        alert('No data to export. Please load some transactions first.');
        return;
    }
    const json = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredTransactions, null, 2));
    const a = document.createElement('a');
    a.href = json;
    a.download = 'transactions.json';
    a.click();
}

function generateCSVContent(transactions) {
    // Create proper CSV with headers
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note'];
    const rows = transactions.map(t => [
        t.date,
        t.type,
        t.category || t.source || 'N/A',
        t.amount.toFixed(2),
        t.note || ''
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function exportToPDF(transactions = null) {
    const dataToExport = transactions || filteredTransactions;

    if (dataToExport.length === 0) {
        alert('No data to export. Please load some transactions first.');
        return;
    }

    try {
        // Create a simple text-based report
        const content = generatePDFContent(dataToExport);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_report_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Error creating PDF. Please try again.');
    }
}

function generatePDFContent(transactions) {
    let content = `CASHBOOK TRANSACTION REPORT\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    content += `Total Transactions: ${transactions.length}\n\n`;

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    content += `SUMMARY\n`;
    content += `Total Income: ৳${totalIncome.toFixed(2)}\n`;
    content += `Total Expense: ৳${totalExpense.toFixed(2)}\n`;
    content += `Net Balance: ৳${(totalIncome - totalExpense).toFixed(2)}\n\n`;

    content += `TRANSACTION DETAILS\n`;
    content += `${'Date'.padEnd(12)} ${'Type'.padEnd(8)} ${'Category'.padEnd(15)} ${'Amount'.padEnd(12)} Description\n`;
    content += `${'-'.repeat(80)}\n`;

    transactions.forEach(transaction => {
        const date = new Date(transaction.date).toLocaleDateString();
        const type = transaction.type.toUpperCase();
        const category = transaction.category || transaction.source || 'N/A';
        const amount = transaction.amount.toFixed(2);
        const description = transaction.note || 'N/A';

        content += `${date.padEnd(12)} ${type.padEnd(8)} ${category.padEnd(15)} ${amount.padEnd(12)} ${description}\n`;
    });

    return content;
}

// Initialize export functions when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('📊 Setting up export handlers...');

    // Setup export button handlers with proper event delegation
    document.addEventListener('click', function (e) {
        if (e.target.id === 'exportCSV') {
            e.preventDefault();
            exportToCSV();
        } else if (e.target.id === 'exportJSON') {
            e.preventDefault();
            exportToJSON();
        } else if (e.target.id === 'exportPDF') {
            e.preventDefault();
            exportToPDF();
        }
    });
});

// Make functions globally available
window.exportToCSV = exportToCSV;
window.exportToJSON = exportToJSON;
window.exportToPDF = exportToPDF;

// Global debug and test functions
window.testDataLoading = async function () {
    console.log('🧪 Testing data loading...');
    const user = window.currentUser || auth.currentUser;
    if (!user) {
        console.log('❌ No user logged in');
        alert('Please log in first');
        return;
    }

    try {
        console.log('🧪 Checking user subcollection...');
        const snapshot = await db.collection('users').doc(user.uid).collection('transactions').get();
        console.log('🧪 Subcollection size:', snapshot.size);

        if (snapshot.empty) {
            console.log('🧪 Checking main collection...');
            const mainSnapshot = await db.collection('transactions').where('userId', '==', user.uid).get();
            console.log('🧪 Main collection size:', mainSnapshot.size);
        }

        console.log('🧪 Triggering loadReport...');
        await loadReport(user);

    } catch (error) {
        console.error('🧪 Test failed:', error);
    }
};

window.testSummaryCards = function () {
    console.log('🧪 Testing summary cards update...');
    const testData = [
        { type: 'income', amount: 1000, category: 'Salary' },
        { type: 'expense', amount: 500, category: 'Food' },
        { type: 'expense', amount: 200, category: 'Transport' }
    ];
    updateSummaryCards(testData);
};

// Export function for module loading
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initReports: () => console.log('Reports initialized') };
}
