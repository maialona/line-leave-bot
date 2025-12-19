
import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, appendSheetRows, updateSheetCell } from '../utils/google-sheets.js';
import { sendBulletinNotification } from '../utils/line-api.js';

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
    // A:ID, B:Time, C:Author, D:Title, E:Content, F:Category, G:Priority, H:Status, I:TargetUnit, J:ScheduledTime, K:ReadBy
    const rows = await getSheetData(env.SHEET_ID, `${BULLETIN_SHEET}!A2:K`, token);
    
    const now = new Date();

    // Filter
    const bulletins = (rows || [])
        .map((row, index) => {
            let readBy = [];
            try {
                if (row[10]) readBy = JSON.parse(row[10]);
            } catch (e) {
                // Ignore parse error, maybe empty
            }

            return {
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
                readBy: readBy,     // Array of UIDs
                rowIndex: index + 2
            };
        })
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
        
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return { bulletins };
}

async function createBulletin(req, env) {
    const data = await req.json();
    const { author, role, title, content, category, priority, targetUnit, status, scheduledTime, notify } = data;

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

    // A:ID, B:Time, C:Author, D:Title, E:Content, F:Category, G:Priority, H:Status, I:TargetUnit, J:ScheduledTime, K:ReadBy
    const row = [id, timestamp, author, title, content, category, priority, finalStatus, finalTarget, finalScheduledTime, '[]'];

    await appendSheetRows(env.SHEET_ID, `${BULLETIN_SHEET}!A2:K`, [row], token);

    // Push Notification Logic
    if (notify && finalStatus === 'published') {
        try {
            // Need to fetch Staff List to get UIDs
            const metaResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`, { headers: { Authorization: `Bearer ${token}` } });
            const metaData = await metaResp.json();
            const firstSheetName = metaData.sheets[0].properties.title;
            
            // A:Unit, D:UID
            const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
            
            // Filter UIDs
            const targetUids = staffRows
                .filter(r => {
                    const unit = r[0]; // Col A
                    const uid = r[3];  // Col D
                    if (!uid) return false;
                    
                    // Filter Logic
                    if (finalTarget === 'All') return true;
                    return unit === finalTarget;
                })
                .map(r => r[3]);

            if (targetUids.length > 0) {
                // Send Notification
                const bulletinData = { title, category, priority, author };
                // Run in background (don't await strictly if not needed, but here we wait to catch error)
                await sendBulletinNotification(targetUids, bulletinData, env);
            }
        } catch (e) {
            console.error('Push Notification Failed', e);
            // Don't fail the creation, just log error
        }
    }

    return { success: true, message: '公告已儲存' };
}

async function signBulletin(req, env) {
    const data = await req.json();
    const { id, uid, name } = data;

    const token = await getAccessToken(env);
    
    // Fetch ID and ReadBy (Col A and K -> Index 0 and 10)
    const rows = await getSheetData(env.SHEET_ID, `${BULLETIN_SHEET}!A2:K`, token);
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) return { success: false, message: '公告不存在' };

    const actualRowIndex = rowIndex + 2;
    let readBy = [];
    try {
        if (rows[rowIndex][10]) readBy = JSON.parse(rows[rowIndex][10]);
    } catch(e) {}

    // 1. Clean up nulls/invalid data
    readBy = readBy.filter(item => item && typeof item === 'string');

    // 2. Check if UID already exists in any string (Format: "Name (UID)")
    // or legacy format which was just "UID"
    const alreadySigned = readBy.some(item => item.includes(uid));

    if (!alreadySigned) {
        // 3. Store new format: "Name (UID)"
        const signature = `${name} (${uid})`;
        readBy.push(signature);
        
        // Update Column K
        await updateSheetCell(env.SHEET_ID, `${BULLETIN_SHEET}!K${actualRowIndex}`, JSON.stringify(readBy), token);
    }
    
    return { success: true };
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
    deleteBulletin,
    signBulletin
};
