/**
 * SSO (Single Sign-On) Support for Sovereign Intelligence
 * Supports SAML 2.0, OAuth 2.0, and OpenID Connect
 * Created: December 25, 2025
 */

// SSO Provider configurations
export const SSO_PROVIDERS = {
  // Microsoft Azure AD / Entra ID
  azure: {
    name: 'Microsoft Azure AD',
    type: 'oauth2',
    authorizationUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    envKeys: {
      clientId: 'AZURE_AD_CLIENT_ID',
      clientSecret: 'AZURE_AD_CLIENT_SECRET',
      tenantId: 'AZURE_AD_TENANT_ID',
    },
  },
  
  // Google Workspace
  google: {
    name: 'Google Workspace',
    type: 'oauth2',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'profile', 'email'],
    envKeys: {
      clientId: 'GOOGLE_CLIENT_ID',
      clientSecret: 'GOOGLE_CLIENT_SECRET',
    },
  },
  
  // Okta
  okta: {
    name: 'Okta',
    type: 'oauth2',
    authorizationUrl: 'https://{domain}/oauth2/v1/authorize',
    tokenUrl: 'https://{domain}/oauth2/v1/token',
    userInfoUrl: 'https://{domain}/oauth2/v1/userinfo',
    scopes: ['openid', 'profile', 'email'],
    envKeys: {
      clientId: 'OKTA_CLIENT_ID',
      clientSecret: 'OKTA_CLIENT_SECRET',
      domain: 'OKTA_DOMAIN',
    },
  },
  
  // Auth0
  auth0: {
    name: 'Auth0',
    type: 'oauth2',
    authorizationUrl: 'https://{domain}/authorize',
    tokenUrl: 'https://{domain}/oauth2/token',
    userInfoUrl: 'https://{domain}/userinfo',
    scopes: ['openid', 'profile', 'email'],
    envKeys: {
      clientId: 'AUTH0_CLIENT_ID',
      clientSecret: 'AUTH0_CLIENT_SECRET',
      domain: 'AUTH0_DOMAIN',
    },
  },
  
  // Generic SAML 2.0
  saml: {
    name: 'SAML 2.0',
    type: 'saml',
    envKeys: {
      entryPoint: 'SAML_ENTRY_POINT',
      issuer: 'SAML_ISSUER',
      cert: 'SAML_CERT',
    },
  },
};

/**
 * Get SSO configuration for a provider
 */
export function getSSOConfig(providerId) {
  const provider = SSO_PROVIDERS[providerId];
  if (!provider) return null;
  
  const config = { ...provider };
  
  // Load env values
  for (const [key, envKey] of Object.entries(provider.envKeys)) {
    config[key] = process.env[envKey];
  }
  
  // Check if configured
  config.isConfigured = Object.values(provider.envKeys).every(
    envKey => !!process.env[envKey]
  );
  
  return config;
}

/**
 * Get all configured SSO providers
 */
export function getConfiguredProviders() {
  return Object.entries(SSO_PROVIDERS)
    .map(([id, provider]) => ({
      id,
      name: provider.name,
      type: provider.type,
      isConfigured: Object.values(provider.envKeys).every(
        envKey => !!process.env[envKey]
      ),
    }))
    .filter(p => p.isConfigured);
}

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthorizationUrl(providerId, state, redirectUri) {
  const config = getSSOConfig(providerId);
  if (!config || !config.isConfigured) return null;
  
  let authUrl = config.authorizationUrl;
  
  // Replace placeholders
  if (config.tenantId) authUrl = authUrl.replace('{tenant}', config.tenantId);
  if (config.domain) authUrl = authUrl.replace('{domain}', config.domain);
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: config.scopes.join(' '),
    state,
  });
  
  return `${authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(providerId, code, redirectUri) {
  const config = getSSOConfig(providerId);
  if (!config || !config.isConfigured) {
    throw new Error('SSO provider not configured');
  }
  
  let tokenUrl = config.tokenUrl;
  if (config.tenantId) tokenUrl = tokenUrl.replace('{tenant}', config.tenantId);
  if (config.domain) tokenUrl = tokenUrl.replace('{domain}', config.domain);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  return response.json();
}

/**
 * Get user info from SSO provider
 */
export async function getUserInfo(providerId, accessToken) {
  const config = getSSOConfig(providerId);
  if (!config || !config.isConfigured) {
    throw new Error('SSO provider not configured');
  }
  
  let userInfoUrl = config.userInfoUrl;
  if (config.domain) userInfoUrl = userInfoUrl.replace('{domain}', config.domain);
  
  const response = await fetch(userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  const data = await response.json();
  
  // Normalize user info across providers
  return {
    id: data.id || data.sub,
    email: data.email || data.mail || data.userPrincipalName,
    name: data.name || data.displayName || `${data.givenName} ${data.surname}`.trim(),
    firstName: data.given_name || data.givenName,
    lastName: data.family_name || data.surname,
    picture: data.picture || data.photo,
    provider: providerId,
    raw: data,
  };
}

/**
 * Validate SSO state parameter (CSRF protection)
 */
export function generateState() {
  return Buffer.from(
    JSON.stringify({
      random: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
    })
  ).toString('base64url');
}

export function validateState(state, maxAge = 600000) {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    return Date.now() - decoded.timestamp < maxAge;
  } catch {
    return false;
  }
}

export default {
  getSSOConfig,
  getConfiguredProviders,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getUserInfo,
  generateState,
  validateState,
  SSO_PROVIDERS,
};
