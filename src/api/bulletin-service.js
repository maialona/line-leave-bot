
import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, appendSheetRows, updateSheetCell } from '../utils/google-sheets.js';
import { sendBulletinNotification } from '../utils/line-api.js';
import { BULLETIN_STATUS, ROLES } from '../constants/common.js';

const BULLETIN_SHEET = 'Bulletin';

// Helper to check permission
function canEdit(role) {
    return ROLES.SUPERVISOR_ROLES.includes(role);
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
             if (b.status === BULLETIN_STATUS.DELETED) return false;

             // Management View: Show everything (except deleted) to admins
             if (mode === 'manage' && canEdit(userRole)) {
                 return true; 
             }
             
             // Normal View: 
             // 1. Must be 'published' (Active/published)
             const isPublished = (b.status === BULLETIN_STATUS.ACTIVE || b.status === BULLETIN_STATUS.PUBLISHED);
             
             // 2. Scheduled Check: If 'scheduled', show ONLY if time has passed
             // Treat scheduledTime as Taiwan Time (+08:00)
             let isScheduledDue = false;
             if (b.status === BULLETIN_STATUS.SCHEDULED && b.scheduledTime) {
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
    const finalStatus = status || BULLETIN_STATUS.PUBLISHED; 
    const finalTarget = targetUnit || 'All';
    const finalScheduledTime = scheduledTime || '';

    // A:ID, B:Time, C:Author, D:Title, E:Content, F:Category, G:Priority, H:Status, I:TargetUnit, J:ScheduledTime, K:ReadBy
    const row = [id, timestamp, author, title, content, category, priority, finalStatus, finalTarget, finalScheduledTime, '[]'];

    await appendSheetRows(env.SHEET_ID, `${BULLETIN_SHEET}!A2:K`, [row], token);

    // Push Notification Logic
    if (notify && finalStatus === BULLETIN_STATUS.PUBLISHED) {
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
    await updateSheetCell(env.SHEET_ID, `${BULLETIN_SHEET}!H${actualRowIndex}`, BULLETIN_STATUS.DELETED, token);

    return { success: true, message: '公告已刪除' };
}

async function getBulletinStats(req, env) {
    const data = await req.json();
    const { id, requestorUnit, requestorRole } = data;

    // Only Supervisors/Admins can check stats
    if (!ROLES.SUPERVISOR_ROLES.includes(requestorRole)) {
        return { success: false, message: '無權限查看' };
    }

    const token = await getAccessToken(env);

    // 1. Get Bulletin Info (Target Unit & ReadBy)
    const bRows = await getSheetData(env.SHEET_ID, `${BULLETIN_SHEET}!A2:K`, token);
    const bulletin = bRows.find(r => r[0] === id);

    if (!bulletin) return { success: false, message: '找不到公告' };

    const targetUnit = bulletin[8]; // Col I
    let readBy = [];
    try {
        if (bulletin[10]) readBy = JSON.parse(bulletin[10]);
    } catch (e) {}

    // 2. Get All Staff
    const metaResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`, { headers: { Authorization: `Bearer ${token}` } });
    const metaData = await metaResp.json();
    const firstSheetName = metaData.sheets[0].properties.title;
    const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);

    // 3. Filter Relevant Staff
    // Logic: 
    // - If Bulletin Target is 'All', we filter by Requestor's Unit (so they only see their own staff).
    // - If Bulletin Target is specific (e.g. 'Unit A'), we filter by that Target Unit.
    // - EXCEPTION: If Requestor is 'System' or top admin? For now assume Supervisor only cares about their unit.
    
    // Actually, if I am Unit A Supervisor, I should only see Unit A staff regardless of whether the bulletin was ensuring for All or Unit A.
    // So filter = Requestor's Unit. (Unless Requestor is "System" or "Admin" who might want to see all).
    // Let's assume RequestorUnit is passed correctly from frontend (e.g. user.unit).
    
    // Safety: If RequestorUnit is empty/undefined, maybe return empty?
    if (!requestorUnit) return { success: false, message: '無法識別您的單位' };

    const relevantStaff = staffRows.filter(r => {
        const unit = r[0]; // Col A
        // If Requestor is 'Admin' or 'System', maybe they can see all? 
        // For simplicity: Strict Unit Match for "Supervisors".
        // Use loose match if needed?
        return unit === requestorUnit;
    });

    // 4. Calculate Unread
    // readBy format: ["Name (UID)", "Name2 (UID2)"] or legacy "UID"
    // specific staff row: [Unit, Title, Role, UID, N/A, IsActive?] -> We assume all in sheet are active? 
    // Ideally check if they are "Active". The sheet col F (index 5) might be status? 
    // user-service says: r[5] might be status? Let's assume all listed are active for now or check if not 'Left'?
    // Previous code didn't check active status explicitly in auth usually.
    
    const unreadList = [];
    const readCount = 0;
    
    // Create a Set of Read UIDs for faster lookup
    const readUids = new Set();
    readBy.forEach(entry => {
        // Entry could be "Name (UID)" or "UID"
        if (entry.includes('(')) {
            const matches = entry.match(/\((.*?)\)/);
            if (matches && matches[1]) readUids.add(matches[1]);
        } else {
            readUids.add(entry);
        }
    });

    relevantStaff.forEach(staff => {
        const uid = staff[3]; // Col D
        const name = staff[1]; // Col B (Staff Name in Col B? Wait, user-service says: r[1] is Name? Let's check.)
        // user-service.js: 
        // const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
        // user = staffRows.find(r => r[3] === uid);
        // Col A: Unit, Col C: Role, Col D: UID. So Col B likely Name.
        
        if (uid && !readUids.has(uid)) {
            unreadList.push(name);
        }
    });

    // Calculate stats for THIS UNIT
    const totalInUnit = relevantStaff.length;
    const unreadCount = unreadList.length;
    const readInUnitCount = totalInUnit - unreadCount;

    return {
        success: true,
        stats: {
            total: totalInUnit,
            read: readInUnitCount,
            unread: unreadCount,
            unreadList: unreadList
        }
    };
}

export const bulletinHandlers = {
    getBulletins,
    createBulletin,
    deleteBulletin,
    signBulletin,
    getBulletinStats
};

