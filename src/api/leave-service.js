import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, updateSheetCell, appendSheetRows } from '../utils/google-sheets.js';
import { uploadImageToDrive } from '../utils/google-drive.js';
import { sendApprovalNotification } from '../utils/line-api.js';

export async function submitLeave(request, env) {
    try {
        const form = await request.json();
        const token = await getAccessToken(env);

        // Upload Image if exists
        let proofUrl = '';
        if (form.proofBase66) {
            proofUrl = await uploadImageToDrive(form.proofBase66, form.name, form.date, env.DRIVE_FOLDER_ID, token);
        }

        // Calculate Duration (Backend Fallback)
        let duration = form.duration;
        if (!duration && form.startTime && form.endTime) {
            const start = new Date(`2000-01-01T${form.startTime}`);
            const end = new Date(`2000-01-01T${form.endTime}`);
            const diff = (end - start) / (1000 * 60); // minutes
            duration = (diff / 60).toFixed(1);
        }

        // Save to Sheet
        const timestamp = new Date().toISOString();
        const rowsToAdd = [];

        if (form.cases && form.cases.length > 0) {
            form.cases.forEach(c => {
                const caseTimeStr = c.startTime && c.endTime ? `(${c.startTime}~${c.endTime})` : '';
                const caseDetail = `${c.caseName} ${caseTimeStr}`;

                rowsToAdd.push([
                    timestamp, form.unit, form.uid, form.name, form.leaveType, form.date,
                    form.timeSlot, // Col G: Global Time
                    caseDetail,    // Col H: Case Name + Time
                    form.reason, proofUrl, 'Pending',
                    form.duration  // Col L: Duration (Hours)
                ]);
            });
        } else {
            rowsToAdd.push([
                timestamp, form.unit, form.uid, form.name, form.leaveType, form.date,
                form.timeSlot, // Col G: Global Time
                '',            // Col H: Empty Case
                form.reason, proofUrl, 'Pending',
                duration  // Col L: Duration (Hours)
            ]);
        }

        await appendSheetRows(env.SHEET_ID, 'Leave_Records', rowsToAdd, token);

        // Send Notification
        await sendApprovalNotification(form, proofUrl, timestamp, env, token);

        return { success: true };
    } catch (e) {
        throw e;
    }
}

export async function getLeaves(request, env) {
    try {
        const { uid } = await request.json();
        const token = await getAccessToken(env);

        // Get User Info (Dynamic Sheet Name)
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
        const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData = await metaResp.json();
        const firstSheetName = metaData.sheets[0].properties.title;

        const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
        const user = staffRows.find(r => r[3] === uid);

        if (!user) throw new Error('User not found');

        const isSupervisor = ['Supervisor', '督導', 'Business Manager', '業務負責人'].includes(user[2]);
        const userUnit = user[0];

        // 2. Check if Leave_Records exists
        const sheetExists = metaData.sheets.some(s => s.properties.title === 'Leave_Records');
        if (!sheetExists) {
            return {
                success: false,
                message: '系統錯誤：找不到 "Leave_Records" 工作表。請在 Google Sheet 中建立名為 "Leave_Records" 的分頁。',
                debug: { error: 'Sheet Leave_Records not found' }
            };
        }

        // 3. Get Leaves (Fetch Header + Data)
        const allRows = await getSheetData(env.SHEET_ID, 'Leave_Records!A1:K', token);

        if (allRows.length < 2) {
            return {
                success: true,
                leaves: [],
                debug: { message: 'Sheet is empty or only has header' }
            };
        }

        const header = allRows[0].map(h => h.trim().toLowerCase());
        const rows = allRows.slice(1);

        // Fixed Column Mapping (Matches the write order in submit-leave)
        const colMap = {
            timestamp: 0,
            unit: 1,
            uid: 2,
            name: 3,
            leaveType: 4,
            date: 5,
            time: 6,
            case: 7,
            reason: 8,
            proof: 9,
            status: 10,
            duration: 11 // Col L
        };

        // Group by Timestamp + UID
        const leavesMap = new Map();
        let comparisonLog = [];

        rows.forEach((r, i) => {
            const rowUnit = String(r[colMap.unit] || '').trim();
            const rowUid = String(r[colMap.uid] || '').trim();
            const rowName = String(r[colMap.name] || '').trim();

            const targetUnit = String(userUnit || '').trim();
            const targetUid = String(uid || '').trim();
            const targetName = String(user[1] || '').trim(); // user[1] is Name from Staff_List

            // Debug first 3 rows comparison
            if (i < 3) {
                comparisonLog.push(`Row ${i}: SheetUID='${rowUid}' vs TargetUID='${targetUid}' -> Match? ${rowUid.toLowerCase() === targetUid.toLowerCase()}`);
            }

            if (isSupervisor) {
                // Supervisor sees all in Unit
                if (rowUnit !== targetUnit) return;
            } else {
                // Staff sees only their own UID AND Name (to prevent leakage if UID is reused)
                if (rowUid.toLowerCase() !== targetUid.toLowerCase() || rowName !== targetName) return;
            }

            const key = r[colMap.timestamp] + '_' + r[colMap.uid];

            if (!leavesMap.has(key)) {
                leavesMap.set(key, {
                    id: key,
                    timestamp: r[colMap.timestamp],
                    uid: r[colMap.uid],
                    name: r[colMap.name],
                    leaveType: r[colMap.leaveType],
                    date: r[colMap.date],
                    reason: r[colMap.reason],
                    proofUrl: r[colMap.proof],
                    status: r[colMap.status] || 'Pending',
                    cases: []
                });
            }
            if (r[colMap.case] || r[colMap.time]) {
                leavesMap.get(key).cases.push({
                    name: r[colMap.case] || '未指定',
                    time: r[colMap.time] || ''
                });
            }
        });

        const leaves = Array.from(leavesMap.values());

        // Sort by timestamp desc (Safe Sort)
        leaves.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime() || 0;
            const dateB = new Date(b.timestamp).getTime() || 0;
            return dateB - dateA;
        });

        return {
            success: true,
            leaves: leaves,
            debug: {
                totalRows: rows.length,
                filteredCount: leaves.length,
                userRole: user[2],
                requestUid: uid,
                colMap: colMap,
                comparisonLog: comparisonLog
            }
        };

    } catch (e) {
        throw e;
    }
}

export async function reviewLeave(request, env) {
    try {
        const { uid, targetUid, timestamp, action, name } = await request.json();
        const token = await getAccessToken(env);

        const rows = await getSheetData(env.SHEET_ID, 'Leave_Records!A:K', token);
        let updatedCount = 0;
        let leaveDate = '';

        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === timestamp && rows[i][2] === targetUid) {
                const status = action === 'approve' ? 'Approved' : 'Rejected';
                await updateSheetCell(env.SHEET_ID, `Leave_Records!K${i + 1}`, status, token);
                leaveDate = rows[i][5];
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            const statusText = action === 'approve' ? '核准' : '駁回';
            await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
                },
                body: JSON.stringify({
                    to: targetUid,
                    messages: [{ type: 'text', text: `您的假單(${name}) - ${leaveDate} 已被${statusText}` }]
                })
            });
            return { success: true };
        } else {
            return { success: false, message: '找不到該假單' };
        }

    } catch (e) {
        throw e;
    }
}

export async function cancelLeave(request, env) {
    try {
        const { uid, timestamp } = await request.json();
        const token = await getAccessToken(env);

        const rows = await getSheetData(env.SHEET_ID, 'Leave_Records!A:K', token);
        let updatedCount = 0;

        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === timestamp && rows[i][2] === uid) {
                if (rows[i][10] !== 'Pending') {
                    return { success: false, message: '只能撤回待審核的假單' };
                }
                await updateSheetCell(env.SHEET_ID, `Leave_Records!K${i + 1}`, 'Cancelled', token);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            return { success: true };
        } else {
            return { success: false, message: '找不到該假單' };
        }

    } catch (e) {
        throw e;
    }
}
