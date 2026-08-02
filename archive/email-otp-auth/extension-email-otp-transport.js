// Historical reference only. This module is not part of the extension bundle.
async function requestOtp(request, normalizeEmail, CloudTransportError, emailValue) {
  const email = normalizeEmail(emailValue);
  if (!email) throw new CloudTransportError('invalid_email', 400);
  await request('/auth/v1/otp', {
    method: 'POST',
    body: { email, create_user: true }
  });
  return { ok: true, email };
}

async function verifyOtp(request, saveSession, normalizeEmail, CloudTransportError, now, emailValue, tokenValue) {
  const email = normalizeEmail(emailValue);
  const token = String(tokenValue || '').replace(/\s+/g, '');
  if (!email || !/^\d{6,8}$/.test(token)) {
    throw new CloudTransportError('invalid_verification_code', 400);
  }
  const body = await request('/auth/v1/verify', {
    method: 'POST',
    body: { email, token, type: 'email' }
  });
  const expiresAt = Number(body && body.expires_at) ||
    Math.floor(now() / 1000) + Math.max(60, Number(body && body.expires_in) || 3600);
  return saveSession({ ...body, expires_at: expiresAt });
}

module.exports = { requestOtp, verifyOtp };
