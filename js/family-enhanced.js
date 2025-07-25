// Enhanced Family functionality for CashBook with better compatibility
console.log('🏠 Family-Enhanced.js loading...');

// Global function declarations for compatibility
window.initFamily = initFamily;
window.showAddMemberModal = showAddMemberModal;
window.hideAddMemberModal = hideAddMemberModal;
window.addFamilyMember = addFamilyMember;
window.shareFamilyExpense = shareFamilyExpense;
window.showFamilyTransactions = showFamilyTransactions;
window.showShareExpenseModal = showShareExpenseModal;
window.hideShareExpenseModal = hideShareExpenseModal;

// State management
let familyMembers = [];
let familyTransactions = [];
let currentUser = null;
let isLoading = false;
let firebaseInitialized = false;

// Initialize Firebase with better error handling
function initializeFirebase() {
    try {
        if (!window.firebase) {
            console.error('❌ Firebase SDK not loaded');
            return false;
        }

        if (!window.firebaseConfig) {
            console.error('❌ Firebase config not found');
            return false;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
            console.log('✅ Firebase initialized successfully');
        }

        firebaseInitialized = true;
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
}

// Format currency with proper Taka symbol
function formatCurrency(amount) {
    try {
        const numAmount = parseFloat(amount) || 0;
        return `৳${numAmount.toLocaleString('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    } catch (error) {
        console.error('Currency formatting error:', error);
        return `৳${amount || 0}`;
    }
}

// Main initialization function
function initFamily() {
    console.log('🚀 Initializing Family functionality...');

    // Initialize Firebase first
    if (!initializeFirebase()) {
        console.error('❌ Cannot initialize Family - Firebase failed');
        showError('Failed to initialize Firebase. Please refresh the page.');
        return;
    }

    // Set up authentication state listener
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            console.log('✅ User authenticated:', user.email);
            loadFamilyData();
        } else {
            console.log('❌ User not authenticated');
            // Don't redirect immediately, let user see the page
            showError('Please log in to access family features.');
        }
    });

    // Initialize UI components
    initializeUI();

    console.log('✅ Family functionality initialized');
}

// Initialize UI components with better error handling
function initializeUI() {
    try {
        console.log('🎨 Initializing UI components...');

        // Add event listeners for action buttons
        const addMemberBtn = document.getElementById('addMemberBtn');
        const shareExpenseBtn = document.getElementById('shareExpenseBtn');

        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', showAddMemberModal);
            console.log('✅ Add member button initialized');
        }

        if (shareExpenseBtn) {
            shareExpenseBtn.addEventListener('click', showShareExpenseModal);
            console.log('✅ Share expense button initialized');
        }

        // Initialize modals
        initializeModals();

        // Initialize forms
        initializeForms();

        console.log('✅ UI components initialized successfully');
    } catch (error) {
        console.error('❌ UI initialization failed:', error);
        showError('Failed to initialize user interface.');
    }
}

// Initialize modals
function initializeModals() {
    // Add event listeners for modal close buttons
    const modalCloseButtons = document.querySelectorAll('.modal-close, .close');
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Add event listeners for modal backgrounds
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Prevent modal content clicks from closing modal
    const modalContents = document.querySelectorAll('.modal-content');
    modalContents.forEach(content => {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
}

// Initialize forms
function initializeForms() {
    const addMemberForm = document.getElementById('addMemberForm');
    const shareExpenseForm = document.getElementById('shareExpenseForm');

    if (addMemberForm) {
        addMemberForm.addEventListener('submit', handleAddMemberSubmit);
        console.log('✅ Add member form initialized');
    }

    if (shareExpenseForm) {
        shareExpenseForm.addEventListener('submit', handleShareExpenseSubmit);
        console.log('✅ Share expense form initialized');
    }
}

// Load family data from Firebase
async function loadFamilyData() {
    if (!currentUser || isLoading || !firebaseInitialized) {
        console.log('⏳ Cannot load family data - conditions not met');
        return;
    }

    try {
        isLoading = true;
        showLoading();

        console.log('📊 Loading family data for user:', currentUser.email);

        // Load family members
        const membersQuery = firebase.firestore()
            .collection('familyMembers')
            .where('userId', '==', currentUser.uid);

        const membersSnapshot = await membersQuery.get();
        familyMembers = membersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load family transactions
        const transactionsQuery = firebase.firestore()
            .collection('familyTransactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(50);

        const transactionsSnapshot = await transactionsQuery.get();
        familyTransactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Loaded ${familyMembers.length} family members and ${familyTransactions.length} transactions`);

        // Update UI
        updateFamilyMembersUI();
        updateFamilyTransactionsUI();
        updateFamilyStats();

    } catch (error) {
        console.error('❌ Error loading family data:', error);
        showError('Failed to load family data. Please try again.');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Update family members UI
function updateFamilyMembersUI() {
    const membersContainer = document.getElementById('familyMembersContainer');
    if (!membersContainer) {
        console.log('⚠️ Family members container not found');
        return;
    }

    if (familyMembers.length === 0) {
        membersContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-users"></i>
                </div>
                <h3>No family members yet</h3>
                <p>Add your first family member to start sharing expenses!</p>
                <button onclick="showAddMemberModal()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add Member
                </button>
            </div>
        `;
        return;
    }

    membersContainer.innerHTML = familyMembers.map(member => `
        <div class="family-member-card">
            <div class="member-avatar">
                <img src="${member.avatar || 'assets/icons/user-default.png'}" alt="${member.name}" onerror="this.src='assets/icons/user-default.png'">
            </div>
            <div class="member-info">
                <h4>${escapeHtml(member.name)}</h4>
                <p class="member-relationship">${escapeHtml(member.relationship || 'Family Member')}</p>
                <small class="member-date">Added: ${formatDate(member.createdAt)}</small>
            </div>
            <div class="member-stats">
                <div class="stat">
                    <span class="stat-label">Total Spent</span>
                    <span class="stat-value">${formatCurrency(member.totalSpent || 0)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Total Shared</span>
                    <span class="stat-value">${formatCurrency(member.totalShared || 0)}</span>
                </div>
            </div>
            <div class="member-actions">
                <button onclick="editMember('${member.id}')" class="btn btn-sm btn-outline">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="removeMember('${member.id}')" class="btn btn-sm btn-danger">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

// Update family transactions UI
function updateFamilyTransactionsUI() {
    const transactionsContainer = document.getElementById('familyTransactionsContainer');
    if (!transactionsContainer) {
        console.log('⚠️ Family transactions container not found');
        return;
    }

    if (familyTransactions.length === 0) {
        transactionsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-receipt"></i>
                </div>
                <h3>No shared expenses yet</h3>
                <p>Start sharing expenses with your family members!</p>
                <button onclick="showShareExpenseModal()" class="btn btn-primary">
                    <i class="fas fa-share-alt"></i> Share Expense
                </button>
            </div>
        `;
        return;
    }

    transactionsContainer.innerHTML = familyTransactions.map(transaction => `
        <div class="family-transaction-card">
            <div class="transaction-icon">
                <i class="fas ${getCategoryIcon(transaction.category)}"></i>
            </div>
            <div class="transaction-details">
                <h4>${escapeHtml(transaction.description)}</h4>
                <p class="transaction-amount">${formatCurrency(transaction.amount)}</p>
                <small class="transaction-date">${formatDate(transaction.date || transaction.createdAt)}</small>
            </div>
            <div class="transaction-members">
                <span class="shared-with">Shared with: ${transaction.sharedWith ? transaction.sharedWith.join(', ') : 'Unknown'}</span>
                <span class="per-person">Per person: ${formatCurrency((transaction.amount || 0) / ((transaction.sharedWith?.length || 1) + 1))}</span>
            </div>
        </div>
    `).join('');
}

// Update family stats
function updateFamilyStats() {
    const totalMembers = familyMembers.length;
    const totalTransactions = familyTransactions.length;
    const totalSharedAmount = familyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Update stats display
    const statsContainer = document.getElementById('familyStatsContainer');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <h3>${totalMembers}</h3>
                    <p>Family Members</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <div class="stat-content">
                    <h3>${totalTransactions}</h3>
                    <p>Shared Expenses</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="stat-content">
                    <h3>${formatCurrency(totalSharedAmount)}</h3>
                    <p>Total Shared</p>
                </div>
            </div>
        `;
    }
}

// Show/hide modals
function showAddMemberModal() {
    const modal = document.getElementById('addMemberModal');
    if (modal) {
        modal.style.display = 'flex';
        // Focus on first input
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function hideAddMemberModal() {
    const modal = document.getElementById('addMemberModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

function showShareExpenseModal() {
    const modal = document.getElementById('shareExpenseModal');
    if (modal) {
        modal.style.display = 'flex';
        updateMemberCheckboxes();
        // Focus on first input
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function hideShareExpenseModal() {
    const modal = document.getElementById('shareExpenseModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

// Update member checkboxes in share expense modal
function updateMemberCheckboxes() {
    const container = document.getElementById('memberCheckboxes');
    if (!container) return;

    if (familyMembers.length === 0) {
        container.innerHTML = `
            <div class="no-members-message">
                <p>No family members available. Add some members first!</p>
                <button onclick="hideShareExpenseModal(); showAddMemberModal();" class="btn btn-primary btn-sm">
                    <i class="fas fa-plus"></i> Add Member
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = familyMembers.map(member => `
        <label class="member-checkbox">
            <input type="checkbox" value="${member.id}" name="sharedWith">
            <span class="checkmark"></span>
            <span class="member-name">${escapeHtml(member.name)}</span>
            <span class="member-relationship">${escapeHtml(member.relationship || '')}</span>
        </label>
    `).join('');
}

// Handle form submissions
async function handleAddMemberSubmit(e) {
    e.preventDefault();

    if (!currentUser) {
        showError('You must be logged in to add family members.');
        return;
    }

    const formData = new FormData(e.target);
    const name = formData.get('name')?.trim();
    const relationship = formData.get('relationship')?.trim();

    if (!name) {
        showError('Please enter a name for the family member.');
        return;
    }

    const memberData = {
        name: name,
        relationship: relationship || 'Family Member',
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalSpent: 0,
        totalShared: 0
    };

    try {
        await addFamilyMember(memberData);
        hideAddMemberModal();
        showSuccess('Family member added successfully!');
    } catch (error) {
        console.error('❌ Error adding member:', error);
        showError('Failed to add family member. Please try again.');
    }
}

async function handleShareExpenseSubmit(e) {
    e.preventDefault();

    if (!currentUser) {
        showError('You must be logged in to share expenses.');
        return;
    }

    const formData = new FormData(e.target);
    const description = formData.get('description')?.trim();
    const amount = parseFloat(formData.get('amount'));
    const category = formData.get('category');
    const date = formData.get('date');
    const sharedWith = Array.from(formData.getAll('sharedWith'));

    if (!description) {
        showError('Please enter a description for the expense.');
        return;
    }

    if (!amount || amount <= 0) {
        showError('Please enter a valid amount.');
        return;
    }

    if (sharedWith.length === 0) {
        showError('Please select at least one family member to share with.');
        return;
    }

    const expenseData = {
        description: description,
        amount: amount,
        category: category || 'Other',
        date: date ? new Date(date) : new Date(),
        sharedWith: sharedWith,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await shareFamilyExpense(expenseData);
        hideShareExpenseModal();
        showSuccess('Expense shared successfully!');
    } catch (error) {
        console.error('❌ Error sharing expense:', error);
        showError('Failed to share expense. Please try again.');
    }
}

// Add family member
async function addFamilyMember(memberData) {
    if (!currentUser || !firebaseInitialized) {
        throw new Error('User not authenticated or Firebase not initialized');
    }

    try {
        console.log('👥 Adding family member:', memberData.name);

        const docRef = await firebase.firestore()
            .collection('familyMembers')
            .add(memberData);

        console.log('✅ Family member added successfully with ID:', docRef.id);

        // Reload family data
        await loadFamilyData();

    } catch (error) {
        console.error('❌ Error adding family member:', error);
        throw error;
    }
}

// Share family expense
async function shareFamilyExpense(expenseData) {
    if (!currentUser || !firebaseInitialized) {
        throw new Error('User not authenticated or Firebase not initialized');
    }

    try {
        console.log('💰 Sharing family expense:', expenseData.description);

        const docRef = await firebase.firestore()
            .collection('familyTransactions')
            .add(expenseData);

        console.log('✅ Family expense shared successfully with ID:', docRef.id);

        // Reload family data
        await loadFamilyData();

    } catch (error) {
        console.error('❌ Error sharing expense:', error);
        throw error;
    }
}

// Show family transactions (for compatibility)
function showFamilyTransactions() {
    console.log('📊 Family transactions are already displayed');
    // Scroll to transactions section if it exists
    const transactionsSection = document.getElementById('familyTransactionsContainer');
    if (transactionsSection) {
        transactionsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Utility functions
function showLoading() {
    const loadingElements = document.querySelectorAll('.loading-indicator');
    loadingElements.forEach(el => {
        el.style.display = 'block';
        el.classList.remove('hidden');
    });
}

function hideLoading() {
    const loadingElements = document.querySelectorAll('.loading-indicator');
    loadingElements.forEach(el => {
        el.style.display = 'none';
        el.classList.add('hidden');
    });
}

function showError(message) {
    console.error('❌ Error:', message);
    createToast(message, 'error');
}

function showSuccess(message) {
    console.log('✅ Success:', message);
    createToast(message, 'success');
}

function createToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.getElementById('familyToast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.id = 'familyToast';
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            <span>${escapeHtml(message)}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    // Auto remove after delay
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, type === 'error' ? 5000 : 3000);
}

// Helper functions
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(date) {
    if (!date) return 'Unknown';

    try {
        const dateObj = date.toDate ? date.toDate() : new Date(date);
        return dateObj.toLocaleDateString('en-BD', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid Date';
    }
}

function getCategoryIcon(category) {
    const icons = {
        'Food': 'fa-utensils',
        'Transportation': 'fa-car',
        'Entertainment': 'fa-film',
        'Shopping': 'fa-shopping-cart',
        'Bills': 'fa-file-invoice-dollar',
        'Healthcare': 'fa-heartbeat',
        'Education': 'fa-graduation-cap',
        'Other': 'fa-question-circle'
    };

    return icons[category] || icons['Other'];
}

// Additional functions for member management
window.editMember = function (memberId) {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return;

    const newName = prompt('Edit member name:', member.name);
    if (newName && newName !== member.name) {
        updateMember(memberId, { name: newName.trim() });
    }
};

window.removeMember = function (memberId) {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return;

    if (confirm(`Are you sure you want to remove ${member.name} from your family?`)) {
        deleteMember(memberId);
    }
};

async function updateMember(memberId, updates) {
    try {
        await firebase.firestore()
            .collection('familyMembers')
            .doc(memberId)
            .update(updates);

        showSuccess('Member updated successfully!');
        loadFamilyData();
    } catch (error) {
        console.error('❌ Error updating member:', error);
        showError('Failed to update member. Please try again.');
    }
}

async function deleteMember(memberId) {
    try {
        await firebase.firestore()
            .collection('familyMembers')
            .doc(memberId)
            .delete();

        showSuccess('Member removed successfully!');
        loadFamilyData();
    } catch (error) {
        console.error('❌ Error removing member:', error);
        showError('Failed to remove member. Please try again.');
    }
}

console.log('✅ Family-Enhanced.js loaded successfully');
