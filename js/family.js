// js/family.js
// Handles family sharing: add member, pending requests, accept/reject, mutual view

if (!window.firebase?.apps?.length && window.firebaseConfig) {
    firebase.initializeApp(window.firebaseConfig || firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

import { db, auth } from '../firebase-config.js';
import { showMessage } from './utils.js';

let currentUser = null;

// Debounce function to prevent rapid firing of events
function debounce(func, wait) {
    e.preventDefault();
    const username = document.getElementById('familyUsername').value.trim();
    const messageDiv = document.getElementById('familyMessage');
    const submitButton = e.target.querySelector('button[type="submit"]');
    const loadingSpinner = submitButton.querySelector('.loading');
    const buttonText = submitButton.querySelector('span:not(.loading)');

    if (!username) {
        showMessage('Please enter a username', 'error');
        return;
    }

    // Show loading state
    submitButton.disabled = true;
    loadingSpinner.classList.remove('hidden');
    buttonText.textContent = 'Sending...';

    try {
        // Check if trying to add self
        if (username === currentUser.displayName || username === currentUser.email) {
            showMessage('Cannot add yourself as a family member', 'error');
            return;
        }

        // Find user by username
        const q = db.collection('users').where('username', '==', username).get();
        if (q.empty) {
            showMessage('User not found. Please check the username and try again.', 'error');
            return;
        }

        const targetUser = q.docs[0];
        const targetUserId = targetUser.id;

        // Check if already family member
        const existingLinkRef = db.collection('family_links').doc(currentUser.uid);
        const existingLink = existingLinkRef.get();
        if (existingLink.exists && existingLink.data()[targetUserId]) {
            showMessage('User is already a family member', 'error');
            return;
        }

        // Check if there's already a pending request
        const pendingRequest = db.collection('notifications')
            .where('to', '==', targetUserId)
            .where('from', '==', currentUser.uid)
            .where('type', '==', 'family_request')
            .where('status', '==', 'pending')
            .get();

        if (!pendingRequest.empty) {
            showMessage('Family invitation already sent to this user', 'error');
            return;
        }

        // Add request to their notifications
        const notificationRef = db.collection('notifications').add({
            to: targetUserId,
            from: currentUser.uid,
            fromUsername: currentUser.displayName || currentUser.email,
            type: 'family_request',
            status: 'pending',
            created: firebase.firestore.FieldValue.serverTimestamp()
        });

        showMessage('Family invitation sent successfully!', 'success');
        document.getElementById('familyUsername').value = '';

    } catch (error) {
        console.error('Error sending family request:', error);
        showMessage('Error sending invitation. Please try again.', 'error');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        loadingSpinner.classList.add('hidden');
        buttonText.textContent = 'Send Invite';
    }
}

// Main initialization function
async function initializeFamilyPage() {
    const addMemberForm = document.getElementById('addMemberForm');
    const memberFilter = document.getElementById('familyMemberFilter');

    if (addMemberForm) {
        addMemberForm.addEventListener('submit', sendFamilyRequest);
    }

    if (memberFilter) {
        memberFilter.addEventListener('change', () => {
            if (currentUser) {
                loadFamilyTransactions(currentUser);
            }
        });
    }

    if (currentUser) {
        await loadPendingRequests(currentUser);
        await loadFamilyMembers(currentUser);
        await loadFamilyTransactions(currentUser);
    }
}

async function sendFamilyRequest(e) {
    const toEmail = document.getElementById('memberEmail').value.trim();
    const message = `Family request from ${currentUser.email}`;

    if (toEmail === currentUser.email) {
        showMessage('You cannot send a request to yourself.', 'error');
        return;
    }

    try {
        // Check if the user exists
        const userQuery = await db.collection('users').where('email', '==', toEmail).get();
        if (userQuery.empty) {
            showMessage('User not found. Please check the email address.', 'error');
            return;
        }

        const toUserId = userQuery.docs[0].id;

        // Check if a request already exists
        const existingNotification = await db.collection('notifications')
            .where('from', '==', currentUser.uid)
            .where('to', '==', toUserId)
            .where('type', '==', 'family_request')
            .get();

        if (!existingNotification.empty) {
            showMessage('A request has already been sent to this user.', 'warning');
            return;
        }

        // Create notification
        await db.collection('notifications').add({
            from: currentUser.uid,
            to: toUserId,
            type: 'family_request',
            message: message,
            status: 'pending',
            timestamp: new Date()
        });

        showMessage('Family request sent successfully!', 'success');
        addMemberForm.reset();

    } catch (error) {
        console.error('Error sending family request:', error);
        showMessage('Error sending request. Please try again.', 'error');
    }
}

async function loadPendingRequests(user) {
    const pendingList = document.getElementById('pendingRequestsList');
    if (!pendingList) return;

    pendingList.innerHTML = '<div class="text-center text-secondary">Loading...</div>';

    try {
        const notificationsQuery = await db.collection('notifications')
            .where('to', '==', user.uid)
            .where('type', '==', 'family_request')
            .where('status', '==', 'pending')
            .orderBy('timestamp', 'desc')
            .get();

        if (notificationsQuery.empty) {
            pendingList.innerHTML = '<div class="text-center text-secondary" data-key="noPendingRequests">No pending requests</div>';
            return;
        }

        pendingList.innerHTML = ''; // Clear loading indicator
        for (const doc of notificationsQuery.docs) {
            const notification = doc.data();
            try {
                const fromUserDoc = await db.collection('users').doc(notification.from).get();
                if (fromUserDoc.exists) {
                    const fromUserData = fromUserDoc.data();
                    const requestItem = document.createElement('div');
                    requestItem.className = 'list-item';
                    requestItem.innerHTML = `
                        <div>
                            <strong>${fromUserData.username || fromUserData.email}</strong>
                            <p class="text-secondary">Wants to join your family</p>
                        </div>
                        <div>
                            <button class="btn btn-success" onclick="acceptFamilyRequest('${doc.id}', '${notification.from}')">Accept</button>
                            <button class="btn btn-danger" onclick="rejectFamilyRequest('${doc.id}')">Reject</button>
                        </div>
                    `;
                    pendingList.appendChild(requestItem);
                }
            } catch (error) {
                console.error("Error fetching user data for notification:", error);
            }
        }
    } catch (error) {
        console.error('Error loading pending requests:', error);
        pendingList.innerHTML = '<div class="text-center text-error">Error loading requests.</div>';
    }
}

async function loadFamilyMembers(user) {
    const membersList = document.getElementById('familyMembersList');
    const memberFilter = document.getElementById('familyMemberFilter');

    if (!membersList) return;

    membersList.innerHTML = '<div class="text-center text-secondary">Loading...</div>';

    // Clear previous options except for 'All'
    while (memberFilter.options.length > 1) {
        memberFilter.remove(1);
    }

    try {
        const familyDoc = await db.collection('family_links').doc(user.uid).get();
        if (!familyDoc.exists || Object.keys(familyDoc.data()).length === 0) {
            membersList.innerHTML = '<div class="text-center text-secondary" data-key="noFamilyMembers">You have no family members yet.</div>';
            return;
        }

        membersList.innerHTML = ''; // Clear loading indicator
        const memberIds = Object.keys(familyDoc.data());
        let loadedCount = 0;

        for (const memberId of memberIds) {
            try {
                const memberDoc = await db.collection('users').doc(memberId).get();
                if (memberDoc.exists) {
                    const memberData = memberDoc.data();
                    const memberItem = document.createElement('div');
                    memberItem.className = 'list-item';
                    memberItem.innerHTML = `
                        <div>
                            <strong>${memberData.username || memberData.email}</strong>
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="removeFamilyMember('${memberId}')">Remove</button>
                    `;
                    membersList.appendChild(memberItem);

                    // Add to filter dropdown
                    const option = document.createElement('option');
                    option.value = memberId;
                    option.textContent = memberData.username || memberData.email;
                    memberFilter.appendChild(option);

                    loadedCount++;
                }
            } catch (error) {
                console.error('Error loading member:', memberId, error);
            }
        }

        if (loadedCount === 0) {
            membersList.innerHTML = '<div class="text-center text-secondary">No valid family members found</div>';
        }

    } catch (error) {
        console.error('Error loading family members:', error);
        membersList.innerHTML = '<div class="text-center text-error">Error loading family members. Please try again.</div>';
    }
}

async function loadFamilyTransactions(user) {
    const transactionsTable = document.getElementById('familyTransactionsTable');
    const memberFilter = document.getElementById('familyMemberFilter');

    if (!transactionsTable) return;

    // Show loading state
    transactionsTable.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Loading transactions...</td></tr>';

    try {
        const selectedMember = memberFilter.value;
        let memberIds = [];

        if (selectedMember === 'all') {
            const familyDoc = await db.collection('family_links').doc(user.uid).get();
            if (familyDoc.exists) {
                memberIds = [user.uid, ...Object.keys(familyDoc.data())];
            } else {
                memberIds = [user.uid];
            }
        } else {
            memberIds = [selectedMember];
        }

        const allTransactions = [];

        for (const memberId of memberIds) {
            try {
                const memberDoc = await db.collection('users').doc(memberId).get();
                const memberName = memberDoc.exists ? (memberDoc.data().username || memberDoc.data().email) : 'Unknown';

                const transactionsQuery = await db.collection('users')
                    .doc(memberId)
                    .collection('transactions')
                    .orderBy('date', 'desc')
                    .limit(50)
                    .get();

                transactionsQuery.forEach(doc => {
                    const transaction = doc.data();
                    transaction.memberName = memberName;
                    transaction.memberId = memberId;
                    allTransactions.push(transaction);
                });
            } catch (error) {
                console.error('Error loading transactions for member:', memberId, error);
            }
        }

        // Sort by date (newest first)
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allTransactions.length === 0) {
            transactionsTable.innerHTML = '<tr><td colspan="6" class="text-center text-secondary" data-key="noTransactions">No transactions found</td></tr>';
            return;
        }

        transactionsTable.innerHTML = '';
        allTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            const amount = Math.abs(transaction.amount);
            const isCurrentUser = transaction.memberId === user.uid;

            row.innerHTML = `
                <td>
                    <strong>${transaction.memberName}</strong>
                    ${isCurrentUser ? '<span class="badge" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary);">You</span>' : ''}
                </td>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td><span class="badge ${transaction.type}">${transaction.type}</span></td>
                <td>${transaction.category || transaction.source || 'N/A'}</td>
                <td class="${transaction.type === 'income' ? 'text-success' : 'text-error'}">
                    ${transaction.type === 'income' ? '+' : '-'}Tk. ${amount.toFixed(2)}
                </td>
                <td>${transaction.note || 'N/A'}</td>
            `;
            transactionsTable.appendChild(row);
        });

        // Add summary row if showing all members
        if (selectedMember === 'all' && allTransactions.length > 0) {
            const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const summaryRow = document.createElement('tr');
            summaryRow.style.backgroundColor = 'var(--surface)';
            summaryRow.style.fontWeight = 'bold';
            summaryRow.innerHTML = `
                <td colspan="3"><strong>Family Total</strong></td>
                <td class="text-success">+Tk. ${totalIncome.toFixed(2)}</td>
                <td class="text-error">-Tk. ${totalExpense.toFixed(2)}</td>
                <td class="text-primary">Net: Tk. ${(totalIncome - totalExpense).toFixed(2)}</td>
            `;
            transactionsTable.appendChild(summaryRow);
        }

    } catch (error) {
        console.error('Error loading family transactions:', error);
        transactionsTable.innerHTML = '<tr><td colspan="6" class="text-center text-error">Error loading transactions. Please try again.</td></tr>';
    }
}

// Global functions for button clicks
window.acceptFamilyRequest = async function (requestId, fromUserId) {
    try {
        // Add family links
        const userLinkRef = db.collection('family_links').doc(currentUser.uid);
        const memberLinkRef = db.collection('family_links').doc(fromUserId);

        await db.runTransaction(async (transaction) => {
            transaction.set(userLinkRef, { [fromUserId]: true }, { merge: true });
            transaction.set(memberLinkRef, { [currentUser.uid]: true }, { merge: true });
            transaction.update(db.collection('notifications').doc(requestId), { status: 'accepted' });
        });

        showMessage('Family request accepted!', 'success');
        await loadPendingRequests(currentUser);
        await loadFamilyMembers(currentUser);

    } catch (error) {
        console.error('Error accepting family request:', error);
        showMessage('Error accepting request. Please try again.', 'error');
    }
};

window.rejectFamilyRequest = async function (requestId) {
    try {
        await db.collection('notifications').doc(requestId).update({
            status: 'rejected'
        });

        showMessage('Family request rejected', 'success');
        await loadPendingRequests(currentUser);

    } catch (error) {
        console.error('Error rejecting family request:', error);
        showMessage('Error rejecting request. Please try again.', 'error');
    }
};

window.removeFamilyMember = async function (memberId) {
    if (!confirm('Are you sure you want to remove this family member?')) {
        return;
    }

    try {
        // Remove from both users' family links using a transaction
        const userLinkRef = db.collection('family_links').doc(currentUser.uid);
        const memberLinkRef = db.collection('family_links').doc(memberId);

        await db.runTransaction(async (transaction) => {
            transaction.update(userLinkRef, { [memberId]: firebase.firestore.FieldValue.delete() });
            transaction.update(memberLinkRef, { [currentUser.uid]: firebase.firestore.FieldValue.delete() });
        });

        showMessage('Family member removed successfully', 'success');
        await loadFamilyMembers(currentUser);
        await loadFamilyTransactions(currentUser);

    } catch (error) {
        console.error('Error removing family member:', error);
        showMessage('Error removing family member. Please try again.', 'error');
    }
};


// Export function for module loading
export function initFamily() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            initializeFamilyPage();
        } else {
            window.location.href = 'login.html';
        }
    });
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('familyMessage');
    if (!messageDiv) return;

    messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}
