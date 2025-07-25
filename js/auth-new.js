// js/auth.js
// Clean, working authentication system

// Firebase variables
let auth, db, realtimeDB, googleProvider;

// Utility functions
function showMessage(element, message, type = 'info') {
    if (element) {
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
    }
}

function clearMessage(element) {
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

function showLoading(button) {
    if (button) {
        button.disabled = true;
        button.textContent = 'Loading...';
    }
}

function hideLoading(button, originalText) {
    if (button) {
        button.disabled = false;
        button.textContent = originalText || 'Submit';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPassword(password) {
    return password && password.length >= 6;
}

function isValidMobile(mobile) {
    const mobileRegex = /^[+]?[0-9]{10,15}$/;
    return mobileRegex.test(mobile);
}

function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._]{3,20}$/;
    return usernameRegex.test(username);
}

// Initialize Firebase
function initFirebase() {
    if (typeof firebase !== 'undefined' && window.firebaseConfig) {
        console.log('🔥 Firebase detected, initializing...');

        // Firebase v8 (CDN)
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
            console.log('✅ Firebase initialized with config');
        } else {
            console.log('✅ Firebase already initialized');
        }

        auth = firebase.auth();
        db = firebase.firestore();
        realtimeDB = firebase.database();
        googleProvider = new firebase.auth.GoogleAuthProvider();

        console.log('✅ Firebase services initialized:', {
            auth: !!auth,
            firestore: !!db,
            realtimeDB: !!realtimeDB,
            googleProvider: !!googleProvider
        });

        // Test database connections
        testDatabaseConnection();

        return true;
    } else {
        console.error('❌ Firebase not loaded or config missing');
        return false;
    }
}

// Test database connection
async function testDatabaseConnection() {
    try {
        console.log('🔍 Testing database connections...');

        // Test Firestore
        await db.collection('test').doc('connection').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: 'connection_test'
        });
        console.log('✅ Firestore connection successful');

        // Test Realtime Database
        await realtimeDB.ref('test/connection').set({
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            test: 'connection_test'
        });
        console.log('✅ Realtime Database connection successful');

    } catch (error) {
        console.error('❌ Database connection test failed:', error);
    }
}

// Signup functionality
function initSignup() {
    console.log('🔄 Initializing signup...');

    const signupForm = document.getElementById('signupForm');
    const googleSignupBtn = document.getElementById('googleSignup');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');

    if (signupForm) {
        console.log('✅ Signup form found');

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('📝 Signup form submitted');

            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const fullName = document.getElementById('fullName').value.trim();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const mobile = document.getElementById('mobile').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Clear previous messages
            clearMessage(errorMsg);
            clearMessage(successMsg);

            // Validation
            if (!fullName || !username || !email || !mobile || !password || !confirmPassword) {
                showMessage(errorMsg, 'Please fill in all fields', 'error');
                return;
            }

            if (!isValidEmail(email)) {
                showMessage(errorMsg, 'Please enter a valid email address', 'error');
                return;
            }

            if (!isValidPassword(password)) {
                showMessage(errorMsg, 'Password must be at least 6 characters long', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showMessage(errorMsg, 'Passwords do not match', 'error');
                return;
            }

            if (!isValidMobile(mobile)) {
                showMessage(errorMsg, 'Please enter a valid mobile number', 'error');
                return;
            }

            if (!isValidUsername(username)) {
                showMessage(errorMsg, 'Username must be 3-20 characters long and contain only letters, numbers, dots, and underscores', 'error');
                return;
            }

            try {
                showLoading(submitBtn);
                console.log('🚀 Starting signup process...');
                console.log('📋 Form data:', { fullName, username, email, mobile });

                // Step 1: Create user account
                console.log('🔐 Creating Firebase user...');
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                console.log('✅ Firebase user created:', user.uid);

                // Step 2: Update profile
                console.log('👤 Updating user profile...');
                await user.updateProfile({
                    displayName: fullName
                });
                console.log('✅ User profile updated');

                // Step 3: Prepare user data
                const userData = {
                    fullName,
                    username,
                    email,
                    mobile,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    emailVerified: false,
                    profilePicture: '',
                    currency: 'BDT',
                    language: 'en',
                    theme: 'light',
                    emailNotifications: true,
                    smartSuggestions: true
                };

                console.log('📊 User data prepared:', userData);

                // Step 4: Save to Firestore
                console.log('💾 Saving to Firestore...');
                await db.collection('users').doc(user.uid).set(userData);
                console.log('✅ Successfully saved to Firestore');

                // Step 5: Save to Realtime Database
                console.log('💾 Saving to Realtime Database...');
                const realtimeUserData = {
                    ...userData,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                await realtimeDB.ref('users/' + user.uid).set(realtimeUserData);
                console.log('✅ Successfully saved to Realtime Database');

                // Step 6: Send email verification
                console.log('📧 Sending email verification...');
                await user.sendEmailVerification();
                console.log('✅ Email verification sent');

                // Step 7: Success message
                showMessage(successMsg, 'Account created successfully! Please check your email for verification.', 'success');

                // Step 8: Clear form
                signupForm.reset();

                console.log('🎉 Signup process completed successfully!');

            } catch (error) {
                console.error('❌ Signup error:', error);
                console.error('Error details:', error.code, error.message);
                showMessage(errorMsg, error.message || 'Sign up failed. Please try again.', 'error');
            } finally {
                hideLoading(submitBtn);
            }
        });
    } else {
        console.log('❌ Signup form not found');
    }

    // Google signup
    if (googleSignupBtn) {
        console.log('✅ Google signup button found');

        googleSignupBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('🔗 Google signup clicked');

            try {
                showLoading(googleSignupBtn);
                console.log('🔗 Starting Google signup...');

                const result = await auth.signInWithPopup(googleProvider);
                const user = result.user;
                console.log('✅ Google user signed in:', user.uid);

                // Check if user already exists
                const userDoc = await db.collection('users').doc(user.uid).get();

                if (!userDoc.exists) {
                    console.log('📝 Creating new user document for Google user...');

                    // Create username from email
                    const baseUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9._]/g, '');
                    let username = baseUsername;

                    // Check if username already exists and make it unique
                    let counter = 1;
                    while (true) {
                        const usernameQuery = await db.collection('users').where('username', '==', username).get();
                        if (usernameQuery.empty) break;
                        username = `${baseUsername}${counter}`;
                        counter++;
                    }

                    const userData = {
                        fullName: user.displayName || '',
                        username: username,
                        email: user.email,
                        mobile: user.phoneNumber || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        emailVerified: user.emailVerified,
                        profilePicture: user.photoURL || '',
                        currency: 'BDT',
                        language: 'en',
                        theme: 'light',
                        emailNotifications: true,
                        smartSuggestions: true,
                        isGoogleUser: true
                    };

                    // Save to both databases
                    await db.collection('users').doc(user.uid).set(userData);
                    console.log('✅ Google user saved to Firestore');

                    const realtimeUserData = {
                        ...userData,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    await realtimeDB.ref('users/' + user.uid).set(realtimeUserData);
                    console.log('✅ Google user saved to Realtime Database');
                }

                showMessage(successMsg, 'Account created successfully!', 'success');

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);

            } catch (error) {
                console.error('❌ Google signup error:', error);
                showMessage(errorMsg, error.message || 'Google sign up failed. Please try again.', 'error');
            } finally {
                hideLoading(googleSignupBtn);
            }
        });
    } else {
        console.log('❌ Google signup button not found');
    }
}

// Login functionality
function initLogin() {
    console.log('🔄 Initializing login...');

    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');

    if (loginForm) {
        console.log('✅ Login form found');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🔐 Login form submitted');

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            // Clear previous messages
            clearMessage(errorMsg);
            clearMessage(successMsg);

            // Validation
            if (!username || !password) {
                showMessage(errorMsg, 'Please fill in all fields', 'error');
                return;
            }

            try {
                showLoading(submitBtn);
                console.log('🔐 Starting login process...');

                // Login with email/password
                const userCredential = await auth.signInWithEmailAndPassword(username, password);
                const user = userCredential.user;
                console.log('✅ User logged in:', user.uid);

                showMessage(successMsg, 'Login successful!', 'success');

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                console.error('❌ Login error:', error);
                showMessage(errorMsg, error.message || 'Login failed. Please try again.', 'error');
            } finally {
                hideLoading(submitBtn);
            }
        });
    } else {
        console.log('❌ Login form not found');
    }
}

// Logout functionality
function initLogout() {
    console.log('🔄 Initializing logout...');

    const logoutBtns = document.querySelectorAll('[id*="logout"], [id*="Logout"]');
    console.log('🔍 Found logout buttons:', logoutBtns.length);

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('🚪 Logout clicked');

            try {
                console.log('🔐 Logging out user...');
                await auth.signOut();
                console.log('✅ User logged out successfully');

                // Clear stored data
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');

                // Redirect to login
                window.location.href = 'index.html';

            } catch (error) {
                console.error('❌ Logout error:', error);
                alert('Logout failed: ' + error.message);
            }
        });
    });
}

// Auth state monitoring
function initAuth() {
    console.log('🔄 Initializing auth state monitoring...');

    if (auth) {
        auth.onAuthStateChanged(user => {
            console.log('🔄 Auth state changed:', user ? 'User logged in' : 'User logged out');

            if (user) {
                console.log('✅ User authenticated:', user.uid, user.email);

                // Allow access to protected pages
                if (window.location.pathname.includes('login.html') ||
                    window.location.pathname.includes('signup.html') ||
                    window.location.pathname.includes('index.html')) {
                    // User is logged in but on public page, redirect to dashboard
                    window.location.href = 'dashboard.html';
                }
            } else {
                console.log('❌ User not authenticated');

                // Redirect to login if on protected pages
                if (window.location.pathname.includes('dashboard.html') ||
                    window.location.pathname.includes('report.html') ||
                    window.location.pathname.includes('family.html') ||
                    window.location.pathname.includes('profile.html')) {
                    window.location.href = 'login.html';
                }
            }
        });
    }
}

// Language toggle functionality
function initLanguageToggle() {
    console.log('🔄 Initializing language toggle...');

    const langToggleBtns = document.querySelectorAll('#langToggle');
    console.log('🔍 Found language toggle buttons:', langToggleBtns.length);

    langToggleBtns.forEach(btn => {
        // Set initial button text
        const currentLang = localStorage.getItem('language') || 'en';
        btn.innerHTML = currentLang === 'en' ? '<span>🌐</span><span>English</span>' : '<span>🌐</span><span>বাংলা</span>';

        btn.addEventListener('click', async () => {
            console.log('🌐 Language toggle clicked');

            const currentLang = localStorage.getItem('language') || 'en';
            const newLang = currentLang === 'en' ? 'bn' : 'en';

            localStorage.setItem('language', newLang);
            btn.innerHTML = newLang === 'en' ? '<span>🌐</span><span>English</span>' : '<span>🌐</span><span>বাংলা</span>';

            console.log('🌐 Language changed to:', newLang);
            window.location.reload();
        });
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing authentication system...');

    // Wait for Firebase to load
    setTimeout(() => {
        const firebaseReady = initFirebase();

        if (firebaseReady) {
            console.log('✅ Firebase ready, initializing components...');

            // Initialize auth state monitoring
            initAuth();

            // Initialize logout functionality
            initLogout();

            // Initialize language toggle
            initLanguageToggle();

            // Initialize page-specific functions
            const currentPage = window.location.pathname;
            console.log('🔍 Current page:', currentPage);

            if (currentPage.includes('signup.html')) {
                console.log('📝 Initializing signup page');
                initSignup();
            } else if (currentPage.includes('login.html')) {
                console.log('🔐 Initializing login page');
                initLogin();
            }

            console.log('✅ Authentication system initialized successfully!');
        } else {
            console.error('❌ Firebase not ready, authentication system not initialized');
        }
    }, 200);
});
