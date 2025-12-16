
export async function getSheetData(sheetId, range, token) {
    // IMPORTANT: encodeURIComponent is crucial for handling special chars like '!' in range
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await resp.json();
    if (data.error) {
        throw new Error(`Google Sheets API Error: ${data.error.message} (${data.error.code})`);
    }
    return data.values || [];
}

export async function updateSheetCell(sheetId, range, value, token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[value]] }),
    });
}

export async function appendSheetRows(sheetId, range, values, token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: values }),
    });
}
