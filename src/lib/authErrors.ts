export function loginErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  if (
    ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(
      code,
    )
  )
    return 'Usuario o contraseña incorrectos.'
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Espera un poco.'
  if (code === 'auth/network-request-failed') return 'Sin conexión.'
  return 'No se pudo iniciar sesión.'
}
