const admin = require('firebase-admin')
const serviceAccount = require('./gradus-26a77-firebase-adminsdk-fbsvc-7267a72476.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gradus-26a77.firebaseio.com",
});

const db = admin.firestore();
module.exports = { admin, db };