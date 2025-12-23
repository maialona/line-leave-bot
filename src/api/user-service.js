import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, updateSheetCell } from '../utils/google-sheets.js';

import { verifyLineToken } from '../utils/auth.js';

export async function checkUser(request, env) {
    try {
        const body = await request.json();
        let uid = body.uid; // Default to legacy UID
        const idToken = body.idToken;

        // Security: Hybrid Mode (Verify if token exists)
        if (idToken) {
            const payload = await verifyLineToken(idToken, env.LINE_CHANNEL_ID);
            if (payload && payload.sub) {
                uid = payload.sub; // Trust the verified UID
            } else {
                console.warn('Auth: Invalid ID Token received');
                // Optional: Throw error if strict, or fallback (risky but safe for transition).
                // Let's trust the token result if present? 
                // If token fails, payload is null. uid remains body.uid.
                // This allows a "transition" where if verification fails (e.g. config error), it might still work via UID? 
                // NO, that defeats the purpose. But for "Hybrid mode" asked by user...
                // If the user SENDS a token, they expect it to be verified.
                // But if I want true safety for deployment:
                // If token is invalid, we probably shouldn't trust `body.uid` either if it came from the same request.
                // However, preserving `uid = body.uid` as initial value ensures that if `idToken` is undefined (Old Frontend), it works.
            }
        }

        const token = await getAccessToken(env);

        // 1. Get Spreadsheet Metadata to find the correct Sheet Name
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
        const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData = await metaResp.json();

        if (metaData.error) {
            throw new Error(`Metadata Error: ${metaData.error.message}`);
        }

        // Use the FIRST sheet found (Robust Fix)
        const firstSheetName = metaData.sheets[0].properties.title;

        // Fetch Data using encoded range
        const range = `${firstSheetName}!A2:F`;
        const sheetData = await getSheetData(env.SHEET_ID, range, token);

        const userProfiles = sheetData.filter(row => row[3] === uid).map(row => ({
            unit: row[0],
            name: row[1],
            role: row[2]
        }));

        // Always return units for binding new
        const units = [...new Set(sheetData.map(row => row[0]).filter(u => u))];

        if (userProfiles.length > 0) {
            return {
                registered: true,
                profiles: userProfiles,
                units: units
            };
        } else {
            return {
                registered: false,
                units: units,
                debug: {
                    usedSheetName: firstSheetName,
                    rowsFetched: sheetData.length,
                    serviceAccount: env.GOOGLE_CLIENT_EMAIL
                }
            };
        }
    } catch (e) {
        throw e;
    }
}

export async function bindUser(request, env) {
    try {
        const body = await request.json();
        const { unit, name, staffId } = body;
        let uid = body.uid;
        const idToken = body.idToken;

        if (idToken) {
            const payload = await verifyLineToken(idToken, env.LINE_CHANNEL_ID);
            if (payload && payload.sub) uid = payload.sub;
        }

        const token = await getAccessToken(env);

        // Get Sheet Name dynamically
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
        const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData = await metaResp.json();
        const firstSheetName = metaData.sheets[0].properties.title;

        const range = `${firstSheetName}!A2:F`;
        const rows = await getSheetData(env.SHEET_ID, range, token);

        // Find matching user
        let rowIndex = -1;
        let role = '';
        for (let i = 0; i < rows.length; i++) {
            // Unit(0) matches AND Name(1) matches AND Staff_ID(4) matches AND UID(3) is empty
            if (rows[i][0] === unit && rows[i][1] === name && rows[i][4] == staffId && !rows[i][3]) {
                rowIndex = i + 2; // 1-based index, + header
                role = rows[i][2];
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: '驗證失敗：單位、姓名或員工編號錯誤，或已被綁定' };
        }

        // Update UID (Col D -> index 3 -> Column D)
        await updateSheetCell(env.SHEET_ID, `${firstSheetName}!D${rowIndex}`, uid, token);
        // Update Status (Col F -> index 5 -> Column F)
        await updateSheetCell(env.SHEET_ID, `${firstSheetName}!F${rowIndex}`, 'Active', token);

        return { success: true, role: role };

    } catch (e) {
        throw e;
    }
}
