import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, updateSheetCell, appendSheetRows, mapHeadersToIndexes, colIndexToLetter } from '../utils/google-sheets.js';
import { uploadImageToDrive } from '../utils/google-drive.js';
import { sendApprovalNotification } from '../utils/line-api.js';
import { LEAVE_STATUS, ROLES } from '../constants/common.js';

export async function submitLeave(request, env, ctx) {
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

        // Check for Batch Dates
        const dates = form.dates || [form.date];
        const timestamp = new Date().toISOString();
        const rowsToAdd = [];

        // Loop through dates
        dates.forEach(dateStr => {
            // Case Logic per Date
             if (form.cases && form.cases.length > 0) {
                 form.cases.forEach(c => {
                    if (c.slots && c.slots.length > 0) {
                        c.slots.forEach(slot => {
                            const caseTimeStr = slot.startTime && slot.endTime ? ` (${slot.startTime}~${slot.endTime})` : '';
                            const subStr = slot.substitute ? ' [需代班]' : '';
                            const caseDetail = `${c.caseName}${caseTimeStr}${subStr}`;

                            rowsToAdd.push([
                                timestamp, form.unit, form.uid, form.name, form.leaveType, dateStr,
                                form.timeSlot, // Col G: Global Time
                                caseDetail,    // Col H: Case Name + Time
                                form.reason, proofUrl, LEAVE_STATUS.PENDING,
                                form.duration  // Col L: Duration (Hours)
                            ]);
                        });
                    } else {
                        // Fallback: Case with no slots (Shouldn't happen with UI validation but safe to handle)
                        rowsToAdd.push([
                            timestamp, form.unit, form.uid, form.name, form.leaveType, dateStr,
                            form.timeSlot, 
                            c.caseName, // Just Name
                            form.reason, proofUrl, LEAVE_STATUS.PENDING,
                            form.duration
                        ]);
                    }
                });
            } else {
                rowsToAdd.push([
                    timestamp, form.unit, form.uid, form.name, form.leaveType, dateStr,
                    form.timeSlot, // Col G: Global Time
                    '',            // Col H: Empty Case
                    form.reason, proofUrl, LEAVE_STATUS.PENDING,
                    duration  // Col L: Duration (Hours)
                ]);
            }
        });

        await appendSheetRows(env.SHEET_ID, 'Leave_Records!A:A', rowsToAdd, token);
        console.log("Leave recorded:", timestamp, "Count:", rowsToAdd.length);

        // Send Notification (Single Notification for Batch)
        // Modify form to represent the batch for notification
        const notifyData = { ...form, date: dates.join(', ') + (dates.length > 1 ? ` (共${dates.length}天)` : '') };
        
        if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(sendApprovalNotification(notifyData, proofUrl, timestamp, env, token).catch(e => console.error("Async Notify Error:", e)));
        } else {
            // Fallback
             try {
                await sendApprovalNotification(form, proofUrl, timestamp, env, token);
            } catch (notifyError) {
                console.error("Failed to send notification:", notifyError);
            }
        }

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

        const isSupervisor = ROLES.SUPERVISOR_ROLES.includes(user[2]);
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
        const allRows = await getSheetData(env.SHEET_ID, 'Leave_Records!A1:Z', token); // Fetch more columns to be safe

        if (allRows.length < 2) {
            return {
                success: true,
                leaves: [],
                debug: { message: 'Sheet is empty or only has header' }
            };
        }

        const header = allRows[0];
        const rows = allRows.slice(1);

        // Dynamic Column Mapping
        const schema = {
            timestamp: ['Timestamp', '時間戳記', '填寫時間'],
            unit: ['Unit', '單位', '所屬單位', '機構'],
            uid: ['UID', 'User ID', '使用者ID'],
            name: ['Name', '姓名', '居服員'],
            leaveType: ['Leave Type', '假別'],
            date: ['Date', '日期', '請假日期'],
            time: ['Time Slot', '時間', '起訖時間'],
            case: ['Case', '個案', '受影響個案'],
            reason: ['Reason', '事由', '原因'],
            proof: ['Proof', '證明', '圖片', '證明文件'],
            status: ['Status', '狀態', '審核狀態'],
            duration: ['Duration', '時數']
        };
        
        let colMap = mapHeadersToIndexes(header, schema);

        // Fallback for missing columns (Backwards Compatibility with hardcoded indexes)
        const defaults = {
            timestamp: 0, unit: 1, uid: 2, name: 3, leaveType: 4, 
            date: 5, time: 6, case: 7, reason: 8, proof: 9, status: 10, duration: 11
        };
        for (const key in defaults) {
            if (colMap[key] === -1 || colMap[key] === undefined) {
                colMap[key] = defaults[key];
            }
        }
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
                comparisonLog.push(`Row ${i} (First): SheetUID='${rowUid}' vs TargetUID='${targetUid}' -> Match? ${rowUid.toLowerCase() === targetUid.toLowerCase()}`);
            }
            // Debug last 3 rows comparison
            if (i >= rows.length - 3) {
                comparisonLog.push(`Row ${i} (Last): SheetUID='${rowUid}' vs TargetUID='${targetUid}' -> Match? ${rowUid.toLowerCase() === targetUid.toLowerCase()}`);
            }

            // Hybrid Filter:
            // 1. If Supervisor, allow matching Unit.
            // 2. ALWAYS allow matching own UID (so they see their own leaves even if unit mismatches)
            let isMatch = false;
            
            if (isSupervisor) {
                if (rowUnit === targetUnit && targetUnit) isMatch = true;
            }
            
            if (rowUid.toLowerCase() === targetUid.toLowerCase()) isMatch = true;

            if (!isMatch) return;

            const key = r[colMap.timestamp] + '_' + r[colMap.uid];

            if (!leavesMap.has(key)) {
                leavesMap.set(key, {
                    id: key,
                    timestamp: r[colMap.timestamp],
                    uid: r[colMap.uid],
                    name: r[colMap.name],
                    leaveType: r[colMap.leaveType],
                    // Initialize with stored date, but we will recalculate later
                    date: r[colMap.date], 
                    timeSlot: r[colMap.time], 
                    duration: r[colMap.duration], 
                    reason: r[colMap.reason],
                    proofUrl: r[colMap.proof],
                    status: r[colMap.status] || LEAVE_STATUS.PENDING,
                    cases: [],
                    // Date Aggregation Set
                    dateSet: new Set()
                });
            }
            // Always add date to set
            if (r[colMap.date]) {
                leavesMap.get(key).dateSet.add(r[colMap.date]);
            }

            if (r[colMap.case]) {
                const rawCase = r[colMap.case];
                // Regex to parse: "Name (08:00~09:00) [需代班]"
                // Case 1: "ClientA (08:00~09:00) [需代班]"
                // Case 2: "ClientB (10:00~11:00)"
                // Case 3: "ClientC" (Backward compat)
                
                const match = rawCase.match(/^(.*?)(?:\s\((.*?)\))?(?:\s\[(.*?)\])?$/);
                let cName = rawCase;
                let cTime = '';
                let cSub = false;

                if (match) {
                    cName = match[1] || rawCase;
                    cTime = match[2] || '';
                    cSub = !!match[3]; // If exists, it represents substitute needed
                }
                
                const currentCases = leavesMap.get(key).cases;
                const isDuplicate = currentCases.some(c => 
                    c.name === cName.trim() && 
                    c.time === cTime && 
                    c.substitute === cSub
                );

                if (!isDuplicate) {
                    currentCases.push({
                        name: cName.trim(),
                        time: cTime,
                        substitute: cSub
                    });
                }
            }
        });

        const leaves = Array.from(leavesMap.values());

        // Process Date Ranges
        leaves.forEach(leave => {
            if (leave.dateSet && leave.dateSet.size > 1) {
                const dates = Array.from(leave.dateSet).sort();
                // Simple Range: First ~ Last
                leave.date = `${dates[0]} ~ ${dates[dates.length - 1]}`;
            }
            // Cleanup Set
            delete leave.dateSet;
        });

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

        const rows = await getSheetData(env.SHEET_ID, 'Leave_Records!A:Z', token);
        if (rows.length < 1) throw new Error('Empty Sheet');

        const schema = {
            timestamp: ['Timestamp', '時間戳記', '填寫時間'],
            uid: ['UID', 'User ID', '使用者ID'],
            status: ['Status', '狀態', '審核狀態'],
            date: ['Date', '日期', '請假日期']
        };
        const colMap = mapHeadersToIndexes(rows[0], schema);
        
        // Fallbacks
        if (colMap.timestamp === -1) colMap.timestamp = 0;
        if (colMap.uid === -1) colMap.uid = 2;
        if (colMap.status === -1) colMap.status = 10;
        if (colMap.date === -1) colMap.date = 5;

        const statusColLetter = colIndexToLetter(colMap.status);

        let updatedCount = 0;
        let leaveDate = '';

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][colMap.timestamp] === timestamp && rows[i][colMap.uid] === targetUid) {
                const status = action === 'approve' ? LEAVE_STATUS.APPROVED : LEAVE_STATUS.REJECTED;
                await updateSheetCell(env.SHEET_ID, `Leave_Records!${statusColLetter}${i + 1}`, status, token);
                leaveDate = rows[i][colMap.date];
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

        const rows = await getSheetData(env.SHEET_ID, 'Leave_Records!A:Z', token);
        if (rows.length < 1) throw new Error('Empty Sheet');

        const schema = {
            timestamp: ['Timestamp', '時間戳記', '填寫時間'],
            uid: ['UID', 'User ID', '使用者ID'],
            status: ['Status', '狀態', '審核狀態']
        };
        const colMap = mapHeadersToIndexes(rows[0], schema);

        // Fallbacks
        if (colMap.timestamp === -1) colMap.timestamp = 0;
        if (colMap.uid === -1) colMap.uid = 2;
        if (colMap.status === -1) colMap.status = 10;

        const statusColLetter = colIndexToLetter(colMap.status);
        let updatedCount = 0;

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][colMap.timestamp] === timestamp && rows[i][colMap.uid] === uid) {
                if (rows[i][colMap.status] !== LEAVE_STATUS.PENDING) {
                    return { success: false, message: '只能撤回待審核的假單' };
                }
                await updateSheetCell(env.SHEET_ID, `Leave_Records!${statusColLetter}${i + 1}`, LEAVE_STATUS.CANCELLED, token);
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
