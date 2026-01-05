
export async function getSheetData(sheetId, range, token) {
    // IMPORTANT: encodeURIComponent is crucial for handling special chars like '!' in range
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
    // Use cache: 'no-store' to prevent caching
    const resp = await fetch(url, { 
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' 
    });
    const data = await resp.json();
    if (data.error) {
        throw new Error(`Google Sheets API Error: ${data.error.message} (${data.error.code})`);
    }
    return data.values || [];
}

export async function updateSheetCell(sheetId, range, value, token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const resp = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[value]] }),
    });
    const data = await resp.json();
    if (data.error) {
        throw new Error(`Google Sheets Update Error: ${data.error.message}`);
    }
}

export async function appendSheetRows(sheetId, range, values, token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: values }),
    });
    const data = await resp.json();
    if (data.error) {
        throw new Error(`Google Sheets Append Error: ${data.error.message}`);
    }
}


/**
 * Maps header names to column indexes based on a schema.
 * @param {Array<string>} headerRow - The first row of the sheet (headers).
 * @param {Object} schema - Keys are internal field names, Values are arrays of possible header names.
 * @returns {Object} Map of field name to column index (or -1 if not found).
 */
export function mapHeadersToIndexes(headerRow, schema) {
    const normalizedHeaders = headerRow.map(h => String(h).trim().toLowerCase());
    const map = {};

    for (const [key, possibleNames] of Object.entries(schema)) {
        let index = -1;
        for (const name of possibleNames) {
            const search = name.toLowerCase();
            index = normalizedHeaders.findIndex(h => h === search || h.includes(search));
            if (index !== -1) break;
        }
        map[key] = index;
    }
    return map;
}

/**
 * Converts 0-based column index to A1 notation letter (e.g., 0 -> A, 26 -> AA).
 * @param {number} index 
 * @returns {string} column letter
 */
export function colIndexToLetter(index) {
    let temp, letter = '';
    while (index >= 0) {
        temp = index % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}
