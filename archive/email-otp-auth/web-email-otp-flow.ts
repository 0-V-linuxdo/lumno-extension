// Historical reference only. This file is not imported by the Lumno web app.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestEmailOtp(supabase: any, emailValue: string) {
  const email = emailValue.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error("invalid_email");
  return supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
}

export async function verifyEmailOtp(supabase: any, emailValue: string, tokenValue: string) {
  const email = emailValue.trim().toLowerCase();
  const token = tokenValue.replace(/\s+/g, "");
  if (!EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(token)) {
    throw new Error("invalid_verification_code");
  }
  return supabase.auth.verifyOtp({ email, token, type: "email" });
}
