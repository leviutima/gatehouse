export function authorizationRedirect(
  redirectUri: string,
  params: Record<string, string | null>,
): string {
  const url = new URL(redirectUri);
  for (const [name, value] of Object.entries(params)) {
    if (value !== null) {
      url.searchParams.set(name, value);
    }
  }
  return url.toString();
}
