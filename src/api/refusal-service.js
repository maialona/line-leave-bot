
import { getAccessToken } from '../utils/google-auth.js';
import { appendSheetRows, getSheetData } from '../utils/google-sheets.js';

export async function submitRefusal(request, env) {
    try {
        const form = await request.json();
        const token = await getAccessToken(env);

        const timestamp = new Date().toISOString();
        const rowData = [
            timestamp,              // Col A: Timestamp
            form.supervisorName,    // Col B: Assigning Supervisor (派案督導員)
            form.agency,            // Col C: Agency (居服員所屬機構)
            form.attendantName,     // Col D: Assigned Attendant (受案服務員)
            form.refusalDate,       // Col E: Refusal Date (拒接案日期)
            form.assessments.join(', '), // Col F: Assessment (狀況評估)
            form.reason             // Col G: Specific Reason (具體事由)
        ];

        // Append to 'Refusal_Reports' sheet
        // Note: The sheet 'Refusal_Reports' must exist in the spreadsheet.
        await appendSheetRows(env.SHEET_ID, 'Refusal_Reports!A:A', [rowData], token);

        return { success: true };
    } catch (e) {
        console.error('Submit Refusal Error:', e);
        // Fallback: If sheet doesn't exist, it might error. Ideally we check existence or create.
        // For now, consistent with other services, we assume it exists or throw.
        throw e;
    }
}

export async function getRefusalStats(request, env) {
    try {
        const token = await getAccessToken(env);
        
        // Read Refusal_Reports Sheet
        // Columns: A:Timestamp, B:Supervisor, C:Agency, D:Attendant, E:Date, F:Assessment, G:Reason
        // We need Agency (C) and Attendant (D) for aggregation.
        // Let's fetch A:D to be safe or just C:D? simpler to fetch all used range or A:D.
        
        // Using existing helper getSheetData
        // Need to import getSheetData first if not implicitly available (it is not, I need to check imports)
        // Check imports in file...
        // imports are: getAccessToken, appendSheetRows. Need to add getSheetData.
        
        // Let's assume I fix imports in a separate/same block.
        const rows = await getSheetData(env.SHEET_ID, 'Refusal_Reports!A2:D', token);
        
        if (!rows || rows.length === 0) {
            return { success: true, stats: [] };
        }

        const statsMap = {};

        rows.forEach(row => {
            // Col C = Index 2 (Agency), Col D = Index 3 (Attendant)
            const agency = row[2] || 'Unknown';
            const attendant = row[3] || 'Unknown';
            
            if (!agency && !attendant) return; // Skip empty

            const key = `${agency}-${attendant}`;
            if (!statsMap[key]) {
                statsMap[key] = {
                    agency,
                    attendant,
                    count: 0
                };
            }
            statsMap[key].count++;
        });

        const stats = Object.values(statsMap); // Convert values to array

        // Sort by Count desc? or Agency? User didn't specify. Agency then Count is reasonable.
        stats.sort((a, b) => b.count - a.count);

        return { success: true, stats };

    } catch (e) {
        console.error('Get Refusal Stats Error:', e);
        // If sheet doesn't exist, return empty
        return { success: true, stats: [] }; 
    }
}
