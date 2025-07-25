// Simple Database Test and Fix for CashBook
// This script will test and fix the database saving issue

// Test and fix user creation
async function testAndFixUserCreation() {
    console.log('=== Testing User Creation and Database Saving ===');

    // 1. Test Firebase connection
    console.log('Testing Firebase connection...');
    try {
        await db.collection('test').doc('connection').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: 'working'
        });
        console.log('✅ Firestore connection working');
    } catch (error) {
        console.error('❌ Firestore connection failed:', error);
        return;
    }

    try {
        await realtimeDB.ref('test/connection').set({
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            test: 'working'
        });
        console.log('✅ Realtime Database connection working');
    } catch (error) {
        console.error('❌ Realtime Database connection failed:', error);
        return;
    }

    // 2. Test user creation with immediate database save
    console.log('\n=== Testing User Creation ===');

    const testEmail = 'test_' + Date.now() + '@example.com';
    const testPassword = 'password123';

    try {
        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(testEmail, testPassword);
        const user = userCredential.user;
        console.log('✅ User created in Authentication:', user.uid);

        // Prepare user data
        const userData = {
            fullName: 'Test User',
            username: 'testuser_' + Date.now(),
            email: testEmail,
            mobile: '1234567890',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false,
            profilePicture: '',
            currency: 'BDT',
            language: 'en',
            theme: 'light',
            emailNotifications: true,
            smartSuggestions: true
        };

        // Save to Firestore
        console.log('Saving to Firestore...');
        await db.collection('users').doc(user.uid).set(userData);
        console.log('✅ Saved to Firestore');

        // Verify Firestore save
        const firestoreDoc = await db.collection('users').doc(user.uid).get();
        if (firestoreDoc.exists) {
            console.log('✅ Firestore verification successful');
        } else {
            console.error('❌ Firestore verification failed');
        }

        // Save to Realtime Database
        console.log('Saving to Realtime Database...');
        const realtimeUserData = {
            ...userData,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        await realtimeDB.ref('users/' + user.uid).set(realtimeUserData);
        console.log('✅ Saved to Realtime Database');

        // Verify Realtime Database save
        const realtimeSnapshot = await realtimeDB.ref('users/' + user.uid).once('value');
        if (realtimeSnapshot.exists()) {
            console.log('✅ Realtime Database verification successful');
        } else {
            console.error('❌ Realtime Database verification failed');
        }

        // Clean up - delete test user
        await user.delete();
        console.log('✅ Test user cleaned up');

    } catch (error) {
        console.error('❌ User creation test failed:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message
        });
    }
}

// Function to fix existing users who don't have database records
async function fixExistingUsers() {
    console.log('\n=== Fixing Existing Users ===');

    // Get current auth user
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log('No current user to fix');
        return;
    }

    console.log('Checking user:', currentUser.uid);

    // Check if user data exists in Firestore
    const firestoreDoc = await db.collection('users').doc(currentUser.uid).get();
    if (!firestoreDoc.exists) {
        console.log('Creating missing Firestore record...');

        const userData = {
            fullName: currentUser.displayName || 'User',
            username: currentUser.email.split('@')[0],
            email: currentUser.email,
            mobile: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: currentUser.emailVerified,
            profilePicture: '',
            currency: 'BDT',
            language: 'en',
            theme: 'light',
            emailNotifications: true,
            smartSuggestions: true
        };

        await db.collection('users').doc(currentUser.uid).set(userData);
        console.log('✅ Firestore record created');
    } else {
        console.log('✅ Firestore record already exists');
    }

    // Check if user data exists in Realtime Database
    const realtimeSnapshot = await realtimeDB.ref('users/' + currentUser.uid).once('value');
    if (!realtimeSnapshot.exists()) {
        console.log('Creating missing Realtime Database record...');

        const userData = {
            fullName: currentUser.displayName || 'User',
            username: currentUser.email.split('@')[0],
            email: currentUser.email,
            mobile: '',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            emailVerified: currentUser.emailVerified,
            profilePicture: '',
            currency: 'BDT',
            language: 'en',
            theme: 'light',
            emailNotifications: true,
            smartSuggestions: true
        };

        await realtimeDB.ref('users/' + currentUser.uid).set(userData);
        console.log('✅ Realtime Database record created');
    } else {
        console.log('✅ Realtime Database record already exists');
    }
}

// Run tests
console.log('Starting database tests...');
testAndFixUserCreation();

// If you're logged in, fix your existing user
if (auth.currentUser) {
    fixExistingUsers();
}
