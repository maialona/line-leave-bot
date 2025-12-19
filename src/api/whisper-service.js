
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
    const { senderUid, senderName, unit, recipientUid, recipientName, subject, content, isAnonymous, category } = data;
    const token = await getAccessToken(env);
    
    const id = crypto.randomUUID();
    const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const status = 'Unread';
    
    // Columns: ID, Timestamp, SenderUID, SenderName, Unit, RecipientUID, RecipientName, Subject, Content, Status, ReplyContent, ReplyTime, ReplyAuthor, IsAnonymous, History, Category
    const row = [
        id, timestamp, senderUid, senderName, unit, recipientUid, recipientName, subject, content, status, '', '', '', isAnonymous ? 'true' : 'false', '', category || '一般'
    ];
    
    // Append to Col A-P (16 columns)
    await appendSheetRows(env.SHEET_ID, `${WHISPER_SHEET}!A2:P`, [row], token);
    
    // Notification
    try {
        await sendWhisperNotification(recipientUid, senderName, subject, env, isAnonymous);
    } catch (e) { console.error('Notify Error:', e); }
    
    return { success: true, message: '悄悄話已送出' };
}

async function getWhispers(req, env) {
    const { uid, role } = await req.json();
    
    const token = await getAccessToken(env);
    // Fetch up to Column P (Category)
    const rows = await getSheetData(env.SHEET_ID, `${WHISPER_SHEET}!A2:P`, token);
    
    // Columns: 0:ID ... 14:History, 15:Category
    
    let filtered = [];
    if (role === 'staff') {
        filtered = rows.filter(row => row[2] === uid && row[9] !== 'Deleted');
    } else {
        filtered = rows.filter(row => {
            const isMatch = row[5] === uid && row[9] !== 'Deleted';
            return isMatch;
        });
    }
    
    // Format for frontend
    const messages = filtered.map((row, index) => {
        const isAnonymous = String(row[13]).toLowerCase() === 'true';
        let displayName = row[3];
        
        const isRecipient = row[5] === uid;
        if (isRecipient && isAnonymous) {
            displayName = '🤫 匿名';
        }

        // Construct History
        let history = [];
        if (row[14]) {
            try {
                history = JSON.parse(row[14]);
            } catch (e) {
                 // Tolerate bad JSON (like manual "test" entry)
                 console.error('Error parsing history');
            }
        } 
        
        // Lazy Migration: If history is empty (or failed parse), build from legacy
        if (history.length === 0) {
            // 1. Original Message
            history.push({
                sender: isAnonymous ? '🤫 匿名' : row[3],
                uid: row[2], 
                content: row[8],
                timestamp: row[1],
                role: 'staff'
            });
            // 2. Legacy Reply (if exists)
            if (row[10]) {
                history.push({
                    sender: row[12], 
                    uid: row[5], 
                    content: row[10], 
                    timestamp: row[11], 
                    role: 'supervisor' 
                });
            }
        }

        return {
            id: row[0],
            timestamp: row[1],
            senderUid: row[2],
            senderName: displayName,
            unit: row[4],
            recipientUid: row[5],
            recipientName: row[6],
            subject: row[7],
            content: row[8],
            status: row[9],
            isAnonymous: isAnonymous,
            history: history,
            category: row[15] || '一般', // Default legacy to General
            rowIndex: index + 2
        };
    });
    
    // Sort by timestamp descending (newest first)
    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { 
        messages
    };
}

async function replyWhisper(req, env) {
    try {
        const data = await req.json();
        const { id, message, authorName, authorUid, authorRole } = data; // New Payload
        const token = await getAccessToken(env);
        
        const rows = await getSheetData(env.SHEET_ID, `${WHISPER_SHEET}!A2:P`, token); 
        const rowIndex = rows.findIndex(row => row[0] === id);
        
        if (rowIndex === -1) {
            return { success: false, message: 'Message not found' };
        }
        
        const actualRowIndex = rowIndex + 2;
        const currentRow = rows[rowIndex];
        const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        
        // 1. Get/Build Current History
        let history = [];
        if (currentRow[14]) {
            try {
                history = JSON.parse(currentRow[14]);
            } catch (e) {}
        }
        
        if (history.length === 0) {
            const isAnon = String(currentRow[13]).toLowerCase() === 'true';
            history.push({
                sender: isAnon ? '🤫 匿名' : currentRow[3],
                uid: currentRow[2],
                content: currentRow[8],
                timestamp: currentRow[1],
                role: 'staff'
            });
            if (currentRow[10]) {
                history.push({
                    sender: currentRow[12],
                    uid: currentRow[5],
                    content: currentRow[10],
                    timestamp: currentRow[11],
                    role: 'supervisor'
                });
            }
        }
        
        // 2. Append New Message
        history.push({
            sender: authorName,
            uid: authorUid,
            content: message,
            timestamp: timestamp,
            role: authorRole
        });
        
        // 3. Determine New Status & Update
        const newStatus = authorRole === 'supervisor' ? 'Replied' : 'Unread';
        
        // Writes
        await updateSheetCell(env.SHEET_ID, `${WHISPER_SHEET}!J${actualRowIndex}`, newStatus, token);
        await updateSheetCell(env.SHEET_ID, `${WHISPER_SHEET}!O${actualRowIndex}`, JSON.stringify(history), token);
        
        // 4. Notification
        try {
            const senderUid = currentRow[2];
            const recipientUid = currentRow[5];
            const subject = currentRow[7];
            
            if (authorRole === 'supervisor') {
                await sendWhisperReplyNotification(senderUid, authorName, subject, env);
            } else {
                const senderName = currentRow[3];
                const isAnon = String(currentRow[13]).toLowerCase() === 'true';
                await sendWhisperNotification(recipientUid, senderName, `Re: ${subject}`, env, isAnon);
            }
        } catch (e) { console.error('Notify Reply Error:', e); }

        return { success: true, message: '已發送' };
    } catch (e) {
        console.error('ReplyWhisper Error:', e);
        return { success: false, message: `System Error: ${e.message}` };
    }
}

async function deleteWhisper(req, env) {
    const { id } = await req.json();
    const token = await getAccessToken(env);

    // Find Row
    const rows = await getSheetData(env.SHEET_ID, `${WHISPER_SHEET}!A2:A`, token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) return { success: false, message: 'Message not found' };
    
    const actualRowIndex = rowIndex + 2;
    // Update Status to 'Deleted' (Col J)
    await updateSheetCell(env.SHEET_ID, `${WHISPER_SHEET}!J${actualRowIndex}`, 'Deleted', token);
    
    return { success: true, message: '已刪除' };
}

// ... existing code ...

async function markAsRead(req, env) {
    const data = await req.json();
    const { id } = data;
    const token = await getAccessToken(env);
    
    const rows = await getSheetData(env.SHEET_ID, `${WHISPER_SHEET}!A2:A`, token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) {
        return { success: false, message: 'Message not found' };
    }
    
    const actualRowIndex = rowIndex + 2;
    // Update Status (Column J -> Index 9) to 'Read'
    // Status column is J. 
    await updateSheetCell(env.SHEET_ID, `${WHISPER_SHEET}!J${actualRowIndex}`, 'Read', token);
    
    return { success: true };
}

export const whisperHandlers = {
    getRecipients,
    submitWhisper,
    getWhispers,
    replyWhisper,
    deleteWhisper,
    markAsRead // Export this
};
