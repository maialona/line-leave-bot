
// --- Drive API Wrapper (Via GAS Web App) ---
export async function uploadImageToDrive(base66, name, date, folderId, token) {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyuknVDwqW2Syj0aZRITSyPTsPPFdxh4D1RDq0NCQCGlaSMtvw0nvdj5cUg9Yx7tzeyug/exec';

    const cleanBase66 = base66.split(',')[1];
    const mimeType = base66.split(';')[0].split(':')[1];

    const payload = {
        type: 'upload',
        base66: cleanBase66,
        mimeType: mimeType,
        name: `LeaveProof_${name}_${date}.jpg`,
        folderId: folderId
    };

    const resp = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        throw new Error(`GAS Upload Failed: ${resp.status}`);
    }

    const result = await resp.json();

    if (!result.success) {
        throw new Error(`GAS Upload Error: ${result.error}`);
    }

    return result.url;
}
