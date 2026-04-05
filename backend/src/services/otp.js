import db from '../db/database.js';

// Generate a 6-digit OTP
function generateRandomOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateOTP(beneficiaryId, vendorId) {
  // Invalidate any existing unused OTPs
  db.prepare('UPDATE otps SET is_used = 1 WHERE beneficiary_id = ? AND vendor_id = ? AND is_used = 0')
    .run(beneficiaryId, vendorId);

  const otp = generateRandomOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

  const result = db.prepare(`
    INSERT INTO otps (beneficiary_id, vendor_id, otp_code, expires_at) VALUES (?, ?, ?, ?)
  `).run(beneficiaryId, vendorId, otp, expiresAt);

  return {
    id: result.lastInsertRowid,
    otp,
    expiresAt
  };
}

export function verifyOTP(beneficiaryId, vendorId, otpCode) {
  const otpRecord = db.prepare(`
    SELECT * FROM otps 
    WHERE beneficiary_id = ? AND vendor_id = ? AND otp_code = ? AND is_used = 0 AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 1
  `).get(beneficiaryId, vendorId, otpCode);

  if (!otpRecord) {
    // Check if expired
    const expired = db.prepare(`
      SELECT * FROM otps WHERE beneficiary_id = ? AND vendor_id = ? AND otp_code = ? AND is_used = 0
    `).get(beneficiaryId, vendorId, otpCode);

    if (expired) {
      return { valid: false, error: 'OTP has expired. Please generate a new one.' };
    }
    return { valid: false, error: 'Invalid OTP.' };
  }

  return { valid: true, otpId: otpRecord.id };
}
