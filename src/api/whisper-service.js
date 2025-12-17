
import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, appendSheetRows, updateSheetCell } from '../utils/google-sheets.js';
import { sendWhisperNotification, sendWhisperReplyNotification } from '../utils/line-api.js';

const SHEET_ID = '1-I-uYJ1F8BvjCofN1uG8q24GZ0Vz7Z0L3-K4o0L3-z0'; // Placeholder, should be env var or passed
const STAFF_SHEET = 'Staff_List';
const WHISPER_SHEET = 'Whisper';

async function getRecipients(req, env) {
    const { unit } = await req.json();
    console.log('Fetching recipients for unit:', unit);
    const token = await getAccessToken(env);
    
    // Fetch all staff
    const staffRows = await getSheetData(env.SHEET_ID, `${STAFF_SHEET}!A2:D`, token);
    console.log('Total staff rows found:', staffRows ? staffRows.length : 0);
    
    // Filter: Role is '督導' or '業務負責人' AND Unit matches
    // Columns: Unit(0), Name(1), Role(2), UID(3)
    const validRoles = ['督導', '業務負責人'];
    
    const recipients = staffRows
        .filter(row => {
            const roleMatch = validRoles.includes(row[2]);
            const unitMatch = row[0] === unit;
            const hasUid = !!row[3]; // Ensure UID exists
            // console.log(`Row: ${row[1]}, Role: ${row[2]} (${roleMatch}), Unit: ${row[0]} (${unitMatch})`);
            return roleMatch && unitMatch && hasUid;
        })
        .map(row => ({
            name: row[1],
            uid: row[3]
        }));
    
    console.log('Filtered recipients:', recipients.length);
    
    return { 
        recipients
    };
}

async function submitWhisper(req, env) {
    const data = await req.json();
    const { senderUid, senderName, unit, recipientUid, recipientName, subject, content } = data;
    const token = await getAccessToken(env);
    
    const id = crypto.randomUUID();
    const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const status = 'Unread';
    
    // Columns: ID, Timestamp, SenderUID, SenderName, Unit, RecipientUID, RecipientName, Subject, Content, Status, ReplyContent, ReplyTime, ReplyAuthor
    const row = [
        id, timestamp, senderUid, senderName, unit, recipientUid, recipientName, subject, content, status, '', '', ''
    ];
    
    await appendSheetRows(env.SHEET_ID, `${WHISPER_SHEET}!A2:M`, [row], token);
    
    // Notification
    try {
        await sendWhisperNotification(recipientUid, senderName, subject, env);
    } catch (e) { console.error('Notify Error:', e); }
    
    return { success: true, message: '悄悄話已送出' };
}

async function getWhispers(req, env) {
    const { uid, role } = await req.json();
    
    const token = await getAccessToken(env);
    const rows = await getSheetData(env.SHEET_ID, `${WHISPER_SHEET}!A2:M`, token);
    
    // Columns: 0:ID, 1:Time, 2:SenderUID, 3:SenderName, 4:Unit, 5:RecipientUID, 6:RecipientName, 7:Subject, 8:Content, 9:Status, 10:ReplyContent, 11:ReplyTime, 12:ReplyAuthor
    
    let filtered = [];
    if (role === 'staff') {
        // Staff sees messages they sent
        filtered = rows.filter(row => row[2] === uid);
    } else {
        // Supervisor sees messages sent TO them
        console.log(`[getWhispers] Supervisor mode. Filtering for RecipientUID: ${uid}`);
        filtered = rows.filter(row => {
            const isMatch = row[5] === uid;
            // console.log(`Row[5]: ${row[5]} vs ${uid} => ${isMatch}`);
            return isMatch;
        });
        console.log(`[getWhispers] Found ${filtered.length} messages for supervisor.`);
    }
    
    // Format for frontend
    const messages = filtered.map((row, index) => ({
        id: row[0],
        timestamp: row[1],
        senderUid: row[2],
        senderName: row[3],
        unit: row[4],
        recipientUid: row[5],
        recipientName: row[6],
        subject: row[7],
        content: row[8],
        status: row[9],
        replyContent: row[10] || '',
        replyTime: row[11] || '',
        replyAuthor: row[12] || '',
        rowIndex: index + 2 // 1-based index + header row, used for updating reply
    }));
    
    // Sort by timestamp descending (newest first)
    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { 
        messages
    };
}

async function replyWhisper(req, env) {
    const data = await req.json();
    const { id, replyContent, replyAuthor } = data;
    const token = await getAccessToken(env);
    
    // We need to find the row index first. 
    // Ideally we pass it from frontend, but let's search to be safe or fetch freshly.
    const rows = await getSheetData(env.SHEET_ID, `${WHISPER_SHEET}!A2:A`, token); // Read only IDs
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) {
        return { success: false, message: 'Message not found' };
    }
    
    const actualRowIndex = rowIndex + 2; // +2 for A1 header and 0-based index
    const replyTime = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    // Update Status (Col J -> Index 9), ReplyContent (Col K -> Index 10), ReplyTime (Col L -> Index 11), ReplyAuthor (Col M -> Index 12)
    // We can't update non-contiguous cells easily with batchUpdate using helper, but we can do individually or construct a range.
    // 'Whisper!J{row}:M{row}'
    
    /* 
       Wait, simple updateSheetCell only updates a single cell or we can pass a range.
       The helper `updateSheetCell` takes (sheetId, range, value, token). 
       The implementation does `body: JSON.stringify({ values: [[value]] })`. It assumes updating a single block.
       We want to update J, K, L, M columns for that row.
       
       We need to use `updateSheetRows` logic but `updateSheetCell` implementation seems limited to single value?
       Let's check `updateSheetCell` implementation in google-sheets.js again.
       Line 13: `updateSheetCell(sheetId, range, value, token)`
       Line 18: `values: [[value]]` 
       It wraps the single value in a 2D array. If `value` itself is an array of values, it might be nested wrongly [[ [v1, v2] ]].
       Wait, if I pass a row array as `value`, it becomes `[[ [v1, v2] ]]`. That's 1 row, 1 column containing an array? No.
       
       I might need to fix `updateSheetCell` or create a new `updateSheetRow`.
       Actually, standard sheets API expects `values: [ [v1, v2, v3] ]` for a row update.
       If `updateSheetCell` takes `value` and puts it as `[[value]]`, then `value` should be the scalar or the object.
       
       If `value` is `['Unread', 'content']`, `[[ ['Unread'] ]]` ? No.
       
       Let's assume I need to update cell by cell or fix the helper.
       Actually, I can just update the ReplyContent/Time/Author which are contiguous (K, L, M) and Status (J).
       So J, K, L, M are contiguous.
       
       I will modify `google-sheets.js` to support updating a range of values, or use `updateSheetCell` loop.
       Loop is fine for now, or just send a raw fetch here.
       
       Let's try to update cell by cell for safety or write a `updateSheetRow` helper.
       Actually, I'll just write the fetch call directly here to avoid modifying utils too much if not needed, 
       BUT better to keep it consistent.
       
       Let's peek at `google-sheets.js` again. 
       Line 18: `body: JSON.stringify({ values: [[value]] })` 
       This strictly updates 1 cell (1x1).
       
       I will execute 4 updates or better yet, realize that `replyWhisper` is less frequent so 4 calls is acceptable but slow.
       
       To be essentially correct, I should add `updateSheetJwt` or similar. 
       I will implement `updateSheetRow` in `google-sheets.js` first? 
       No, I'll just do it inside `whisper-service.js` with `fetch` for now to save context switches/potential errors.
       OR I update `google-sheets.js` to accept `values` (array of arrays).
       
       Let's stick to using the existing helper for now, maybe just update status and content.
       I'll use specific ranges.
    */
    
    // Update Status
    await updateSheetCell(env.SHEET_ID, `${WHISPER_SHEET}!J${actualRowIndex}`, 'Replied', token);
    // Update Reply Content
    await updateSheetCell(env.SHEET_ID, `${WHISPER_SHEET}!K${actualRowIndex}`, replyContent, token);
    // Update Reply Time
    await updateSheetCell(env.SHEET_ID, `${WHISPER_SHEET}!L${actualRowIndex}`, replyTime, token);
    // Update Reply Author
    await updateSheetCell(env.SHEET_ID, `${WHISPER_SHEET}!M${actualRowIndex}`, replyAuthor, token);

    // Notification
    try {
        // Fetch original message details for notification
        const msgRow = await getSheetData(env.SHEET_ID, `${WHISPER_SHEET}!C${actualRowIndex}:H${actualRowIndex}`, token);
        // C: SenderUID (index 0 in result), D: SenderName, E: Unit, F: RecipientUID, G: RecipientName, H: Subject (index 5)
        // Wait, getSheetData returns array of rows. Range C{row}:H{row} returns [[C, D, E, F, G, H]].
        if (msgRow && msgRow.length > 0) {
             const senderUid = msgRow[0][0];
             const subject = msgRow[0][5];
             await sendWhisperReplyNotification(senderUid, replyAuthor, subject, env);
        }
    } catch (e) { console.error('Notify Reply Error:', e); }

    return { success: true, message: '已回覆' };
}

export const whisperHandlers = {
    getRecipients,
    submitWhisper,
    getWhispers,
    replyWhisper
};
