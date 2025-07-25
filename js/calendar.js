// js/calendar.js
// Handles calendar view: dots/flags for days with transactions, click to show totals

class Calendar {
    constructor() {
        // Initialize to first day of current month to prevent date rollover issues
        const today = new Date();
        this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        this.isVisible = false;
        this.transactions = [];
        this.currentUser = null;
        console.log('📅 Calendar instance created');
        this.initializeCalendar();
    }

    initializeCalendar() {
        this.setupEventListeners();
        this.updateCurrentMonth();
        console.log('📅 Calendar initialized');
    }

    setupEventListeners() {
        // Use a slight delay to ensure DOM elements are ready
        setTimeout(() => {
            // Previous/Next month buttons
            const prevBtn = document.getElementById('prevMonth');
            const nextBtn = document.getElementById('nextMonth');

            if (prevBtn) {
                // Remove any existing event listeners to prevent duplicates
                prevBtn.replaceWith(prevBtn.cloneNode(true));
                const newPrevBtn = document.getElementById('prevMonth');
                newPrevBtn.addEventListener('click', () => {
                    // Safe month navigation - always use day 1 to prevent month skipping
                    console.log('📅 Previous month clicked - Current:', this.currentDate.toDateString());
                    const year = this.currentDate.getFullYear();
                    const month = this.currentDate.getMonth();
                    this.currentDate = new Date(year, month - 1, 1);
                    console.log('📅 Previous month result:', this.currentDate.toDateString(), '- Month:', this.currentDate.getMonth());
                    this.updateCurrentMonth();
                    this.renderCalendar();
                    // Load transactions for the new month
                    if (this.currentUser) {
                        this.loadTransactions(this.currentUser);
                    }
                });
            }

            if (nextBtn) {
                // Remove any existing event listeners to prevent duplicates
                nextBtn.replaceWith(nextBtn.cloneNode(true));
                const newNextBtn = document.getElementById('nextMonth');
                newNextBtn.addEventListener('click', () => {
                    // Safe month navigation - always use day 1 to prevent month skipping
                    console.log('📅 Next month clicked - Current:', this.currentDate.toDateString());
                    const year = this.currentDate.getFullYear();
                    const month = this.currentDate.getMonth();
                    this.currentDate = new Date(year, month + 1, 1);
                    console.log('📅 Next month result:', this.currentDate.toDateString(), '- Month:', this.currentDate.getMonth());
                    this.updateCurrentMonth();
                    this.renderCalendar();
                    // Load transactions for the new month
                    if (this.currentUser) {
                        this.loadTransactions(this.currentUser);
                    }
                });
            }

            console.log('📅 Calendar event listeners setup complete');
        }, 100);
    }

    updateCurrentMonth() {
        const monthElement = document.getElementById('currentMonth');
        if (monthElement) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            monthElement.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        }
    }

    async loadTransactions(user) {
        if (!user) return;

        this.currentUser = user;

        try {
            console.log('📅 Loading transactions for calendar...');

            // Get Firebase database reference
            const database = window.db || firebase.firestore();

            // Get all transactions for the user and filter by date in JavaScript
            // This is because we need to filter by the 'date' field (user-selected date)
            // rather than 'timestamp' field (server timestamp)
            const snapshot = await database.collection('transactions')
                .where('userId', '==', user.uid)
                .get();

            this.transactions = [];
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();

            snapshot.forEach(doc => {
                const data = doc.data();

                // Use the date field (user-selected date) for filtering
                const transactionDate = new Date(data.date);

                // Check if transaction is in the current month
                if (transactionDate.getFullYear() === year &&
                    transactionDate.getMonth() === month) {

                    this.transactions.push({
                        id: doc.id,
                        ...data,
                        date: transactionDate
                    });
                }
            });

            console.log('📅 Loaded', this.transactions.length, 'transactions for calendar for', year, '-', month + 1);
            this.renderCalendar();

        } catch (error) {
            console.error('❌ Error loading calendar transactions:', error);
        }
    }

    renderCalendar() {
        const calendarDiv = document.getElementById('calendarView');
        if (!calendarDiv) {
            console.error('❌ Calendar div not found');
            return;
        }

        console.log('📅 Rendering calendar with', this.transactions.length, 'transactions');

        // Group transactions by date
        const transactionsByDate = {};
        this.transactions.forEach(transaction => {
            // Handle different date formats
            let dateKey;
            if (transaction.date instanceof Date) {
                // If it's already a Date object
                dateKey = transaction.date.toISOString().split('T')[0];
            } else if (typeof transaction.date === 'string') {
                // If it's a string (like "2024-07-26")
                dateKey = transaction.date;
            } else if (transaction.date && transaction.date.toDate) {
                // If it's a Firestore Timestamp
                dateKey = transaction.date.toDate().toISOString().split('T')[0];
            } else {
                console.warn('⚠️ Invalid date format for transaction:', transaction);
                return;
            }

            console.log('📅 Processing transaction date:', transaction.date, '→', dateKey);
            if (!transactionsByDate[dateKey]) {
                transactionsByDate[dateKey] = { income: 0, expense: 0, count: 0 };
            }

            if (transaction.type === 'income') {
                transactionsByDate[dateKey].income += transaction.amount || 0;
            } else {
                transactionsByDate[dateKey].expense += transaction.amount || 0;
            }
            transactionsByDate[dateKey].count++;
        });

        console.log('📅 Transactions by date:', transactionsByDate);

        // Generate calendar HTML using manual table structure to match transaction table
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let html = `
            <table class="transactions-table calendar-table-custom">
                <thead>
                    <tr>
                        <th>SUN</th>
                        <th>MON</th>
                        <th>TUE</th>
                        <th>WED</th>
                        <th>THU</th>
                        <th>FRI</th>
                        <th>SAT</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let currentWeekDate = new Date(startDate);

        // Calculate number of weeks needed for this month
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const weeksToShow = Math.ceil(totalDays / 7);

        // Show dynamic number of rows based on the month
        for (let week = 0; week < weeksToShow; week++) {
            html += '<tr>';
            for (let day = 0; day < 7; day++) {
                const dateKey = currentWeekDate.toISOString().split('T')[0];
                const dayTransactions = transactionsByDate[dateKey];
                const isCurrentMonth = currentWeekDate.getMonth() === month;
                const isToday = currentWeekDate.toDateString() === new Date().toDateString();

                let cellClass = 'calendar-cell';
                if (!isCurrentMonth) cellClass += ' other-month';
                if (isToday) cellClass += ' today';
                if (dayTransactions && dayTransactions.count > 0) cellClass += ' has-transactions';

                html += `
                    <td class="${cellClass}" data-date="${dateKey}">
                        <div class="day-number">${currentWeekDate.getDate()}</div>
                        ${dayTransactions ? `<div class="transaction-indicators">
                            ${dayTransactions.income > 0 ? '<span class="income-indicator">●</span>' : ''}
                            ${dayTransactions.expense > 0 ? '<span class="expense-indicator">●</span>' : ''}
                        </div>` : ''}
                    </td>
                `;

                currentWeekDate.setDate(currentWeekDate.getDate() + 1);
            }
            html += '</tr>';
        }

        html += '</tbody></table>';
        calendarDiv.innerHTML = html;

        // Add click handlers
        calendarDiv.querySelectorAll('td.calendar-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const date = e.currentTarget.getAttribute('data-date');
                this.showDayDetails(date, transactionsByDate[date]);
            });
        });
    }

    showDayDetails(date, dayData) {
        if (!dayData || dayData.count === 0) {
            alert(`No transactions on ${date}`);
            return;
        }

        // Create a proper date object for display
        const displayDate = new Date(date + 'T00:00:00');
        const formattedDate = displayDate.toLocaleDateString();
        const income = dayData.income.toFixed(2);
        const expense = dayData.expense.toFixed(2);
        const net = (dayData.income - dayData.expense).toFixed(2);

        alert(`📅 ${formattedDate}
        
💰 Income: ৳${income}
💸 Expense: ৳${expense}
📊 Net: ৳${net}
📋 Transactions: ${dayData.count}`);
    }

    toggle() {
        const calendarSection = document.getElementById('calendarSection');
        if (!calendarSection) return;

        this.isVisible = !this.isVisible;

        if (this.isVisible) {
            calendarSection.classList.remove('hidden');
            // Always render the calendar grid first
            this.renderCalendar();
            if (this.currentUser) {
                this.loadTransactions(this.currentUser);
            }
        } else {
            calendarSection.classList.add('hidden');
        }

        console.log('📅 Calendar toggled:', this.isVisible ? 'visible' : 'hidden');
    }

    setUser(user) {
        this.currentUser = user;
        if (this.isVisible && user) {
            this.loadTransactions(user);
        }
    }

    previousMonth() {
        // Safe month navigation - always use day 1 to prevent month skipping
        console.log('📅 Previous month method called - Current:', this.currentDate.toDateString());
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        this.currentDate = new Date(year, month - 1, 1);
        console.log('📅 Previous month method result:', this.currentDate.toDateString(), '- Month:', this.currentDate.getMonth());
        this.updateCurrentMonth();
        this.renderCalendar();
        if (this.currentUser) {
            this.loadTransactions(this.currentUser);
        }
    }

    nextMonth() {
        // Safe month navigation - always use day 1 to prevent month skipping
        console.log('📅 Next month method called - Current:', this.currentDate.toDateString());
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        this.currentDate = new Date(year, month + 1, 1);
        console.log('📅 Next month method result:', this.currentDate.toDateString(), '- Month:', this.currentDate.getMonth());
        this.updateCurrentMonth();
        this.renderCalendar();
        if (this.currentUser) {
            this.loadTransactions(this.currentUser);
        }
    }

    // Public method to refresh calendar when transactions are updated
    refreshCalendar() {
        console.log('📅 Calendar refresh requested');
        if (this.currentUser) {
            this.loadTransactions(this.currentUser);
        } else {
            console.log('❌ No user set for calendar refresh');
        }
    }
}
