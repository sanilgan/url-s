import { authService } from '../services/authService';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: ts-node src/scripts/updatePassword.ts <email> <new-password>');
  process.exit(1);
}

authService.updatePasswordByEmail(email, password)
  .then(() => {
    console.log(`Password successfully updated for ${email}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Password update error:', error);
    process.exit(1);
  });
