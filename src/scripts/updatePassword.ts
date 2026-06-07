import bcrypt from 'bcryptjs';
import pool from '../config/database';

async function updateUserPassword(email: string, newPassword: string) {
    const client = await pool.connect();

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Kullanıcının şifresini güncelle - veritabanı
        const result = await client.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [hashedPassword, email]
        );
        //Kullanıcıyı e-posta ile bulur
        // Eski şifreyi yeni hash ile değiştirir
        // SQL injection güvenliği ($1, $2 parametreler)
        // Kaç satır güncellendiğini kontrol eder

        if (result.rowCount === 0) {
            console.log('User not found');
        } else {
            console.log(`Password successfully updated for ${email}`);
        }
        //Kullanıcı bulunamadıysa hata mesajı
        // Başarılıysa onay mesajı
        // Geri bildirim sağlar

    } catch (error) {
        console.error('Password update error:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

// Usage: ts-node src/scripts/updatePassword.ts
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.log('Usage: ts-node src/scripts/updatePassword.ts <email> <new-password>');
    process.exit(1);
}
//Komut satırından e-posta ve şifre alır
// Eksik parametre kontrolü yapar
// Kullanım talimatı gösterir

updateUserPassword(email, password);
