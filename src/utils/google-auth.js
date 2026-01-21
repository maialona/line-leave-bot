
export async function getAccessToken(env) {
    const pem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const clientEmail = env.GOOGLE_CLIENT_EMAIL;

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    const signatureInput = `${encodedHeader}.${encodedClaim}`;

    const key = await importPrivateKey(pem);
    const signature = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        key,
        new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jwt = `${signatureInput}.${encodedSignature}`;

    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await resp.json();
    return data.access_token;
}

export async function importPrivateKey(pem) {
    if (!pem) throw new Error("Private Key is missing");
    
    try {
        // 1. Remove Headers (if any) and handle literal \n
        let body = pem
            .replace(/\\n/g, '') // Fix: Remove literal backslash-n sequences
            .replace(/["']/g, '') // Remove quotes if user wrapped them
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '');
        
        // 2. Remove all non-base64 characters (whitespace, newlines, etc.)
        let cleaned = body.replace(/[^A-Za-z0-9+/=]/g, '');

        // 3. Fix Padding
        while (cleaned.length % 4 !== 0) {
            cleaned += '=';
        }

        const binaryDerString = atob(cleaned);

        const binaryDer = new Uint8Array(binaryDerString.length);
        for (let i = 0; i < binaryDerString.length; i++) {
            binaryDer[i] = binaryDerString.charCodeAt(i);
        }
        return crypto.subtle.importKey(
            'pkcs8',
            binaryDer.buffer,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['sign']
        );
    } catch (e) {
        console.error("Import Private Key Failed:", e);
        // Extract a safe sample length for debugging
        const len = pem ? pem.length : 0;
        throw new Error(`Private Key Error (Len: ${len}): ${e.message}`);
    }
}
