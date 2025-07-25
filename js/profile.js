// js/profile.js
// Handles profile: show info, change pic, change password, weekly recap, mini pie chart, export center

import {
    formatAmount,
    formatDateDisplay,
    getCurrentDate,
    showMessage,
    clearMessage,
    showLoading,
    hideLoading,
    getCurrency,
    setCurrency,
    CURRENCIES
} from './utils.js';

import { translate } from './i18n.js';

// Firebase references
let auth, db, storage;
let currentUser = null;

// Initialize Firebase
function initFirebase() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
    }
}

// Initialize profile
export function initProfile() {
    initFirebase();

    // Wait for authentication
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserProfile();
            initSettingsHandlers();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Load user profile data
async function loadUserProfile() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            updateProfileDisplay(userData);
        }

        // Load current settings
        loadCurrentSettings();

    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Update profile display
function updateProfileDisplay(userData) {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileUsername = document.getElementById('profileUsername');
    const profileMobile = document.getElementById('profileMobile');
    const profilePhoto = document.getElementById('profilePhoto');

    if (profileName) profileName.textContent = userData.fullName || currentUser.displayName || 'User';
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profileUsername) profileUsername.textContent = userData.username || 'Not set';
    if (profileMobile) profileMobile.textContent = userData.mobile || 'Not set';
    if (profilePhoto) profilePhoto.src = userData.profilePicture || currentUser.photoURL || 'assets/profile_pics/default.png';

    // Check if profile needs completion (Google users)
    if (userData.isGoogleUser && (userData.needsProfile || !userData.username)) {
        showProfileCompletionAlert();
    }
}

// Show profile completion alert for Google users
function showProfileCompletionAlert() {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-info';
    alertDiv.innerHTML = `
        <strong>Complete Your Profile!</strong><br>
        Please add a username and complete your profile information for better security and login options.
        <button onclick="showEditProfile()" class="btn btn-sm btn-primary" style="margin-left: 10px;">Complete Profile</button>
    `;

    // Insert at the top of the main content
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(alertDiv, main.firstChild);
    }
}

// Show edit profile function
window.showEditProfile = function () {
    document.getElementById('editProfileModal').classList.remove('hidden');
}

// Load current settings
function loadCurrentSettings() {
    const currencySelect = document.getElementById('currency');
    const emailNotifications = document.getElementById('emailNotifications');
    const smartSuggestions = document.getElementById('smartSuggestions');

    if (currencySelect) {
        const currentCurrency = getCurrency();
        currencySelect.value = currentCurrency;
    }

    // Load other settings from localStorage
    if (emailNotifications) {
        emailNotifications.checked = localStorage.getItem('emailNotifications') === 'true';
    }

    if (smartSuggestions) {
        smartSuggestions.checked = localStorage.getItem('smartSuggestions') !== 'false'; // default true
    }
}

// Initialize settings handlers
function initSettingsHandlers() {
    const saveSettingsBtn = document.getElementById('saveSettings');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const profilePhotoInput = document.getElementById('profilePhotoInput');
    const updateProfileBtn = document.getElementById('updateProfile');
    const editProfileBtn = document.getElementById('editProfile');

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', handleSaveSettings);
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handleChangePassword);
    }

    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', handlePhotoUpload);
    }

    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', handleUpdateProfile);
    }

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            document.getElementById('editProfileModal').classList.remove('hidden');
            loadCurrentProfileData();
        });
    }

    // Edit profile modal handlers
    initEditProfileModal();
}

// Initialize edit profile modal
function initEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    const closeBtn = document.getElementById('closeEditProfileModal');
    const cancelBtn = document.getElementById('cancelEditProfile');
    const form = document.getElementById('editProfileForm');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (form) {
        form.addEventListener('submit', handleEditProfileSubmit);
    }
}

// Load current profile data into edit form
async function loadCurrentProfileData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();

            document.getElementById('editFullName').value = userData.fullName || currentUser.displayName || '';
            document.getElementById('editUsername').value = userData.username || '';
            document.getElementById('editMobile').value = userData.mobile || '';
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

// Handle edit profile form submission
async function handleEditProfileSubmit(e) {
    e.preventDefault();

    const fullName = document.getElementById('editFullName').value.trim();
    const username = document.getElementById('editUsername').value.trim();
    const mobile = document.getElementById('editMobile').value.trim();
    const profilePictureFile = document.getElementById('editProfilePicture').files[0];

    // Validate username
    if (username && !/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
        showMessage(document.getElementById('editProfileModal'), 'Username must be 3-20 characters long and contain only letters, numbers, dots, and underscores', 'error');
        return;
    }

    try {
        const modal = document.getElementById('editProfileModal');
        showLoading(modal.querySelector('button[type="submit"]'));

        let profilePictureURL = '';

        // Upload profile picture if provided
        if (profilePictureFile) {
            const storageRef = storage.ref(`profile_pictures/${currentUser.uid}`);
            const snapshot = await storageRef.put(profilePictureFile);
            profilePictureURL = await snapshot.ref.getDownloadURL();
        }

        // Update user data
        const updateData = {
            fullName,
            username,
            mobile,
            needsProfile: false // Mark profile as completed
        };

        if (profilePictureURL) {
            updateData.profilePicture = profilePictureURL;
        }

        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update(updateData);

        // Update Realtime Database
        await realtimeDB.ref('users/' + currentUser.uid).update(updateData);

        // Update Firebase Auth profile
        await currentUser.updateProfile({
            displayName: fullName,
            photoURL: profilePictureURL || currentUser.photoURL
        });

        showMessage(modal, 'Profile updated successfully!', 'success');

        // Refresh profile display
        loadUserProfile();

        // Hide modal after delay
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 2000);

    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage(document.getElementById('editProfileModal'), 'Error updating profile. Please try again.', 'error');
    }
}

// Handle save settings
async function handleSaveSettings() {
    const currencySelect = document.getElementById('currency');
    const emailNotifications = document.getElementById('emailNotifications');
    const smartSuggestions = document.getElementById('smartSuggestions');
    const saveBtn = document.getElementById('saveSettings');

    try {
        showLoading(saveBtn);

        // Save currency
        if (currencySelect) {
            setCurrency(currencySelect.value);
        }

        // Save other settings
        if (emailNotifications) {
            localStorage.setItem('emailNotifications', emailNotifications.checked.toString());
        }

        if (smartSuggestions) {
            localStorage.setItem('smartSuggestions', smartSuggestions.checked.toString());
        }

        // Save to Firestore
        await db.collection('users').doc(currentUser.uid).update({
            settings: {
                currency: getCurrency(),
                emailNotifications: emailNotifications?.checked || false,
                smartSuggestions: smartSuggestions?.checked !== false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        });

        showMessage('Settings saved successfully!', 'success');

        // Refresh the page to apply currency changes
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('Error saving settings. Please try again.', 'error');
    } finally {
        hideLoading(saveBtn);
    }
}

// Handle change password
async function handleChangePassword() {
    const currentPassword = prompt('Enter your current password:');
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    const confirmPassword = prompt('Confirm new password:');

    if (!currentPassword || !newPassword || !confirmPassword) {
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters long!', 'error');
        return;
    }

    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );

        await currentUser.reauthenticateWithCredential(credential);

        // Update password
        await currentUser.updatePassword(newPassword);

        showMessage('Password updated successfully!', 'success');

    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password') {
            showMessage('Current password is incorrect!', 'error');
        } else {
            showMessage('Error changing password. Please try again.', 'error');
        }
    }
}

// Handle photo upload
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showMessage('File size must be less than 2MB!', 'error');
        return;
    }

    try {
        showMessage('Uploading photo...', 'info');

        const storageRef = storage.ref(`profile_pics/${currentUser.uid}/${file.name}`);
        const uploadTask = storageRef.put(file);

        uploadTask.on('state_changed',
            (snapshot) => {
                // Progress
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress:', progress + '%');
            },
            (error) => {
                console.error('Upload error:', error);
                showMessage('Error uploading photo. Please try again.', 'error');
            },
            async () => {
                // Complete
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

                // Update user profile
                await currentUser.updateProfile({
                    photoURL: downloadURL
                });

                // Update Firestore
                await db.collection('users').doc(currentUser.uid).update({
                    photoURL: downloadURL
                });

                // Update UI
                const profilePhoto = document.getElementById('profilePhoto');
                if (profilePhoto) {
                    profilePhoto.src = downloadURL;
                }

                showMessage('Photo updated successfully!', 'success');
            }
        );

    } catch (error) {
        console.error('Error uploading photo:', error);
        showMessage('Error uploading photo. Please try again.', 'error');
    }
}

// Handle update profile
async function handleUpdateProfile() {
    const fullName = document.getElementById('editFullName')?.value;
    const username = document.getElementById('editUsername')?.value;
    const mobile = document.getElementById('editMobile')?.value;
    const updateBtn = document.getElementById('updateProfile');

    if (!fullName || !username) {
        showMessage('Please fill in all required fields!', 'error');
        return;
    }

    try {
        showLoading(updateBtn);

        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            fullName,
            username,
            mobile,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update Firebase Auth display name
        await currentUser.updateProfile({
            displayName: fullName
        });

        showMessage('Profile updated successfully!', 'success');

        // Refresh profile display
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile. Please try again.', 'error');
    } finally {
        hideLoading(updateBtn);
    }
}
