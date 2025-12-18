import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, updateSheetCell } from '../utils/google-sheets.js';

export async function checkUser(request, env) {
    try {
        const { uid } = await request.json();
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
        const { uid, unit, name, staffId } = await request.json();
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
        for (let i = 0; i < rows.length; i++) {
            // Unit(0) matches AND Name(1) matches AND Staff_ID(4) matches AND UID(3) is empty
            if (rows[i][0] === unit && rows[i][1] === name && rows[i][4] == staffId && !rows[i][3]) {
                rowIndex = i + 2; // 1-based index, + header
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

        return { success: true };

    } catch (e) {
        throw e;
    }
}
