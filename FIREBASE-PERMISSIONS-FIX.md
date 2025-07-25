# 🔧 Fix Firebase Permissions Error

## The Problem

You're getting "Missing or insufficient permissions" because:

1. Firestore rules require authentication before writing
2. During signup, the user isn't fully authenticated when saving profile data
3. The rules are too restrictive for the signup process

## 🚀 Quick Fix (For Testing)

### Step 1: Update Firestore Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cashbook-5b70b`
3. Go to **Firestore Database** → **Rules**
4. Replace the current rules with these **TEMPORARY DEVELOPMENT RULES**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY: Allow all authenticated users to read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow unauthenticated access to test collection
    match /test/{testId} {
      allow read, write: if true;
    }
  }
}
```

### Step 2: Update Realtime Database Rules

1. Go to **Realtime Database** → **Rules**
2. Replace the current rules with:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "test": {
      ".read": "true",
      ".write": "true"
    }
  }
}
```

### Step 3: Click "Publish" for both rule changes

## 🧪 Test Again

After updating the rules:

1. Open `database-test.html`
2. Click "Test Database Connections"
3. Click "Test Signup Process"

## 🔐 Production Rules (Use Later)

Once testing is complete, use the secure rules from `firestore-rules.txt`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User's transactions
      match /transactions/{transactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's summaries
      match /summaries/{summaryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Test collection (remove in production)
    match /test/{testId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🎯 Why This Fixes It

- **Development rules**: Allow authenticated users to write anywhere
- **Production rules**: Restrict users to their own data only
- **Test collection**: Always accessible for debugging

## ⚠️ Important Notes

1. **Use development rules only for testing**
2. **Switch to production rules before going live**
3. **Never leave permissive rules in production**

## 🔍 Common Issues

- **Rules take 1-2 minutes to propagate**
- **Clear browser cache if issues persist**
- **Check Firebase console for rule syntax errors**

## 📋 Next Steps

1. Update Firebase rules as shown above
2. Test the database connection again
3. Try the signup process
4. Check Firebase console to see saved user data
