/** Add these URLs under Supabase → Authentication → URL Configuration → Redirect URLs */
export function authCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export function authResetPasswordUrl(): string {
  return `${window.location.origin}/auth/reset-password`;
}
