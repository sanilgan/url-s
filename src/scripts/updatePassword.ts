import bcrypt from 'bcryptjs';
import pool from '../config/database';

async function updateUserPassword(email: string, newPassword: string) {
    const client = await pool.connect();

    try {
        // Yeni şifreyi hash'le
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Kullanıcının şifresini güncelle
        const result = await client.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [hashedPassword, email]
        );

        if (result.rowCount === 0) {
            console.log('Kullanıcı bulunamadı');
        } else {
            console.log(`${email} için şifre başarıyla güncellendi`);
        }

    } catch (error) {
        console.error('Şifre güncelleme hatası:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

// Kullanım: ts-node src/scripts/updatePassword.ts
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.log('Kullanım: ts-node src/scripts/updatePassword.ts <email> <yeni-şifre>');
    process.exit(1);
}

updateUserPassword(email, password);
