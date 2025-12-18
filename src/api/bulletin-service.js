
import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, appendSheetRows, updateSheetCell } from '../utils/google-sheets.js';

const BULLETIN_SHEET = 'Bulletin';

// Helper to check permission
function canEdit(role) {
    return ['督導', '業務負責人'].includes(role);
}

async function getBulletins(req, env) {
    const data = await req.json(); // req body might be empty or have params
    const token = await getAccessToken(env);
    
    // Params from body
    const userRole = data.role || '';
    const userUnit = data.unit || '';
    const mode = data.mode || 'view'; // 'view' or 'manage'
    
    // Fetch Data
    // Columns: A:ID, B:Time, C:Author, D:Title, E:Content, F:Category, G:Priority, H:Status, I:TargetUnit, J:ScheduledTime
    const rows = await getSheetData(env.SHEET_ID, `${BULLETIN_SHEET}!A2:J`, token);
    
    const now = new Date();

    // Filter
    const bulletins = (rows || [])
        .map((row, index) => ({
            id: row[0],
            timestamp: row[1],
            author: row[2],
            title: row[3],
            content: row[4],
            category: row[5],
            priority: row[6],
            status: row[7],     // published, draft, scheduled, Deleted
            targetUnit: row[8], // All, or Unit Name
            scheduledTime: row[9],
            rowIndex: index + 2
        }))
        .filter(b => {
             if (b.status === 'Deleted') return false;

             // Management View: Show everything (except deleted) to admins
             if (mode === 'manage' && canEdit(userRole)) {
                 return true; 
             }
             
             // Normal View: 
             // 1. Must be 'published' (Active/published)
             const isPublished = (b.status === 'Active' || b.status === 'published');
             
             // 2. Scheduled Check: If 'scheduled', show ONLY if time has passed
             // Treat scheduledTime as Taiwan Time (+08:00)
             let isScheduledDue = false;
             if (b.status === 'scheduled' && b.scheduledTime) {
                 const schedTime = new Date(`${b.scheduledTime}+08:00`);
                 isScheduledDue = (schedTime <= now);
             }

             if (!isPublished && !isScheduledDue) return false;

             // 3. Scoping: Must be 'All' OR match user's unit
             const isTargetMatch = (b.targetUnit === 'All' || !b.targetUnit || b.targetUnit === userUnit);
             return isTargetMatch;
        });

    // Sort: High priority first, then new to old
    bulletins.sort((a, b) => {
        if (a.priority === 'High' && b.priority !== 'High') return -1;
        if (a.priority !== 'High' && b.priority === 'High') return 1;
        
        // For scheduled items, use scheduledTime as the sort timestamp if visible? 
        // Or just keep using creation timestamp? 
        // Let's us creation timestamp for simplicity, or users might expect scheduled time.
        // Let's stick to Creation Time for now unless requested.
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return { bulletins };
}

async function createBulletin(req, env) {
    const data = await req.json();
    const { author, role, title, content, category, priority, targetUnit, status, scheduledTime } = data;

    if (!canEdit(role)) {
        return { success: false, message: '無權限建立公告' };
    }

    const token = await getAccessToken(env);
    const id = crypto.randomUUID();
    const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    // Default status to 'published' if not provided
    const finalStatus = status || 'published'; 
    const finalTarget = targetUnit || 'All';
    const finalScheduledTime = scheduledTime || '';

    // A:ID, B:Time, C:Author, D:Title, E:Content, F:Category, G:Priority, H:Status, I:TargetUnit, J:ScheduledTime
    const row = [id, timestamp, author, title, content, category, priority, finalStatus, finalTarget, finalScheduledTime];

    await appendSheetRows(env.SHEET_ID, `${BULLETIN_SHEET}!A2:J`, [row], token);

    return { success: true, message: '公告已儲存' };
}

async function deleteBulletin(req, env) {
    const data = await req.json();
    const { id, role, userName } = data;

    if (!canEdit(role)) {
        return { success: false, message: '無權限刪除公告' };
    }

    const token = await getAccessToken(env);
    
    // Find Row
    // A:ID, B:Time, C:Author
    const rows = await getSheetData(env.SHEET_ID, `${BULLETIN_SHEET}!A2:C`, token); // Fetch Author column too
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) return { success: false, message: '找不到公告' };
    
    // Check Ownership
    const author = rows[rowIndex][2];
    if (author !== userName) {
        return { success: false, message: '只能刪除自己發布的公告' };
    }
    
    const actualRowIndex = rowIndex + 2;
    // Update Status to 'Deleted' (Col H)
    await updateSheetCell(env.SHEET_ID, `${BULLETIN_SHEET}!H${actualRowIndex}`, 'Deleted', token);

    return { success: true, message: '公告已刪除' };
}

export const bulletinHandlers = {
    getBulletins,
    createBulletin,
    deleteBulletin
};
