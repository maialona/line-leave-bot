/**
 * Verify LINE ID Token
 * @param {string} idToken - The ID Token string
 * @param {string} channelId - The LINE Channel ID (LIFF ID's prefix usually, or separate Channel ID)
 * @returns {Promise<object|null>} - Returns the payload if valid, null otherwise
 */
export async function verifyLineToken(idToken, channelId) {
    if (!idToken) return null;

    try {
        const params = new URLSearchParams();
        params.append('id_token', idToken);
        params.append('client_id', channelId);

        const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('Token Verification Failed:', err);
            return null;
        }

        const payload = await res.json();
        return payload; // Contains 'sub' (User ID), 'name', 'picture', etc.
    } catch (e) {
        console.error('Verify validation error:', e);
        return null;
    }
}
