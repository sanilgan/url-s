import { getFirestoreDb } from '../config/firebase';

async function checkFirebase() {
  await getFirestoreDb().collection('_health').limit(1).get();
  console.log('Firebase Admin and Cloud Firestore connection successful');
  console.log('Firestore creates the users and urls collections on the first write.');
}

if (require.main === module) {
  checkFirebase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Firebase connection failed:', error);
      process.exit(1);
    });
}

export default checkFirebase;
