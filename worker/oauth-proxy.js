/**
 * Cloudflare Worker — GitHub OAuth Token Exchange Proxy
 *
 * Deploy this to Cloudflare Workers (free tier).
 *
 * Environment variables to set in Cloudflare dashboard:
 *   - GITHUB_CLIENT_ID: Your GitHub OAuth App client ID
 *   - GITHUB_CLIENT_SECRET: Your GitHub OAuth App client secret
 *   - ALLOWED_ORIGINS: Comma-separated list of allowed origins
 *     (e.g., "https://ercrvr.github.io")
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request, env),
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { code } = await request.json();
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing code' }), {
          status: 400,
          headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
        });
      }

      // Exchange the code for an access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      return new Response(JSON.stringify(tokenData), {
        headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
      });
    }
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  const isAllowed = allowed.includes(origin) || allowed.includes('*');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
