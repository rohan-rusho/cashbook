# 💰 CashBook - Personal Finance Management

A modern, responsive web application for tracking personal finances with real-time data visualization and comprehensive reporting features.

## ✨ Features

### 🏠 **Dashboard**
- Real-time balance overview
- Quick transaction entry
- Recent transaction history
- Responsive design for mobile and desktop

### 📊 **Reports & Analytics**
- Interactive charts (Pie, Line, Bar)
- Expense category breakdown
- Date range filtering
- Export to CSV, JSON, and PDF

### 👥 **Family Management**
- Multi-user support
- Family member transaction tracking
- Shared expense management

### 🎨 **User Experience**
- Dark/Light theme toggle
- Bengali currency support (৳)
- PWA (Progressive Web App) support
- Responsive mobile-first design

### 🔐 **Security & Authentication**
- Firebase Authentication
- Secure user data storage
- Real-time database synchronization

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for Firebase services

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cashbook.git
   cd cashbook
   ```

2. Open `index.html` in your web browser or serve with a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

3. Configure Firebase:
   - Update `firebase-config.js` with your Firebase configuration
   - Set up Firestore database rules
   - Enable Authentication in Firebase Console

## 📱 Usage

### Adding Transactions
1. Navigate to the Dashboard
2. Use the quick action buttons or form to add income/expenses
3. Transactions are automatically saved to your account

### Viewing Reports
1. Go to the Reports section
2. Select date range and filters
3. View interactive charts and export data as needed

### Family Management
1. Access the Family section
2. Add family members
3. Track shared expenses and individual spending

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Charts**: Chart.js
- **Export**: jsPDF, SheetJS
- **PWA**: Service Worker, Web App Manifest

## 📂 Project Structure

```
cashbook/
├── index.html              # Landing page
├── dashboard.html          # Main dashboard
├── report.html            # Reports and analytics
├── family.html            # Family management
├── profile.html           # User profile
├── login.html             # Authentication
├── css/
│   └── style.css          # Main stylesheet
├── js/
│   ├── auth.js           # Authentication logic
│   ├── dashboard.js      # Dashboard functionality
│   ├── report.js         # Reports and charts
│   ├── family.js         # Family management
│   ├── theme-init.js     # Theme management
│   └── utils.js          # Utility functions
├── assets/
│   ├── icons/            # App icons
│   └── splash/           # Splash screens
└── lang/
    ├── en.js             # English translations
    └── bn.js             # Bengali translations
```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Update `firebase-config.js` with your config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Database Structure
```
users/{userId}/
├── transactions/
│   ├── {transactionId}
│   │   ├── amount: number
│   │   ├── type: "income" | "expense"
│   │   ├── source: string
│   │   ├── note: string
│   │   └── timestamp: Timestamp
│   └── ...
└── profile/
    ├── name: string
    ├── email: string
    └── preferences: object
```

## 🌍 Internationalization

The app supports multiple languages:
- English (default)
- Bengali (বাংলা)

Language files are located in the `lang/` directory.

## 📱 PWA Features

- Offline functionality
- Add to home screen
- Push notifications (future)
- App-like experience

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

Please use the [GitHub Issues](https://github.com/yourusername/cashbook/issues) page to report bugs or request features.

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com/) for backend services
- [Chart.js](https://www.chartjs.org/) for data visualization
- [jsPDF](https://github.com/parallax/jsPDF) for PDF generation
- [SheetJS](https://sheetjs.com/) for Excel export

## 📊 Screenshots

### Dashboard
![Dashboard](assets/screenshots/dashboard.png)

### Reports
![Reports](assets/screenshots/reports.png)

### Family Management
![Family](assets/screenshots/family.png)

---

**Made with ❤️ for better financial management**
