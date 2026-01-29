import { config, FREEAGENT_AUTH_URL, FREEAGENT_TOKEN_URL } from '../config.js';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshTokenExpiresAt: number;
}

export function generateAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: config.freeagent.clientId,
    redirect_uri: config.freeagent.redirectUri,
    response_type: 'code',
  });

  if (state) {
    params.set('state', state);
  }

  return `${FREEAGENT_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenData> {
  const credentials = Buffer.from(
    `${config.freeagent.clientId}:${config.freeagent.clientSecret}`
  ).toString('base64');

  const response = await fetch(FREEAGENT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.freeagent.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as TokenResponse;
  return tokenResponseToTokenData(data);
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenData> {
  const credentials = Buffer.from(
    `${config.freeagent.clientId}:${config.freeagent.clientSecret}`
  ).toString('base64');

  const response = await fetch(FREEAGENT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as TokenResponse;
  return tokenResponseToTokenData(data);
}

function tokenResponseToTokenData(response: TokenResponse): TokenData {
  const now = Date.now();
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: now + response.expires_in * 1000,
    // Refresh tokens typically expire in 14 days
    refreshTokenExpiresAt: now + 14 * 24 * 60 * 60 * 1000,
  };
}
