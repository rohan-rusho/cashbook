// js/export.js
// Handles export to PDF, CSV, JSON, and upload to Firebase Storage

if (!window.firebase?.apps?.length && window.firebaseConfig) {
    firebase.initializeApp(window.firebaseConfig || firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

async function exportData(user, type, data) {
    let blob, filename;
    if (type === 'csv') {
        const csv = data.map(row => Object.values(row).join(',')).join('\n');
        blob = new Blob([csv], { type: 'text/csv' });
        filename = `${new Date().toISOString().slice(0, 7)}.csv`;
    } else if (type === 'json') {
        blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        filename = `${new Date().toISOString().slice(0, 7)}.json`;
    } else if (type === 'pdf') {
        alert('PDF export requires jsPDF.');
        return;
    }
    const ref = storage.ref(`backups/${user.uid}/${filename}`);
    await ref.put(blob);
    alert('Exported and uploaded!');
}
window.exportData = exportData;
