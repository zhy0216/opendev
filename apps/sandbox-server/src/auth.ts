let bearerToken: string | null = null;

export function setToken(token: string): void {
  bearerToken = token;
}

export function clearToken(): void {
  bearerToken = null;
}

export function verifyAuth(req: Request): boolean {
  if (!bearerToken) return true;
  const header = req.headers.get('Authorization');
  return header === `Bearer ${bearerToken}`;
}
