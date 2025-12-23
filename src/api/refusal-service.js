
import { getAccessToken } from '../utils/google-auth.js';
import { appendSheetRows } from '../utils/google-sheets.js';

export async function submitRefusal(request, env) {
    try {
        const form = await request.json();
        const token = await getAccessToken(env);

        const timestamp = new Date().toISOString();
        const rowData = [
            timestamp,              // Col A: Timestamp
            form.supervisorName,    // Col B: Assigning Supervisor (派案督導員)
            form.attendantName,     // Col C: Assigned Attendant (受案服務員)
            form.refusalDate,       // Col D: Refusal Date (拒接案日期)
            form.assessments.join(', '), // Col E: Assessment (狀況評估)
            form.reason             // Col F: Specific Reason (具體事由)
        ];

        // Append to 'Refusal_Reports' sheet
        // Note: The sheet 'Refusal_Reports' must exist in the spreadsheet.
        await appendSheetRows(env.SHEET_ID, 'Refusal_Reports', [rowData], token);

        return { success: true };
    } catch (e) {
        console.error('Submit Refusal Error:', e);
        // Fallback: If sheet doesn't exist, it might error. Ideally we check existence or create.
        // For now, consistent with other services, we assume it exists or throw.
        throw e;
    }
}
