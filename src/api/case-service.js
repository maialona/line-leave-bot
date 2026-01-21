import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, updateSheetCell, appendSheetRows, mapHeadersToIndexes, colIndexToLetter } from '../utils/google-sheets.js';
import { sendCaseApprovalNotification } from '../utils/line-api.js';
import { CASE_STATUS, ROLES } from '../constants/common.js';

export async function submitCase(request, env) {
    try {
        const form = await request.json();
        const token = await getAccessToken(env);

        const timestamp = new Date().toISOString();
        const rowData = [
            timestamp,              // Col A
            form.staffId,           // Col B
            form.applicant,         // Col C
            form.agency,            // Col D
            form.area,              // Col E
            form.caseName,          // Col F
            form.gender,            // Col G
            form.applyTypes.join(', '), // Col H
            form.devItem || '',     // Col I
            form.devCount || '',    // Col J
            CASE_STATUS.PENDING,    // Col K: Status
            '',                     // Col L: Reviewer
            ''                      // Col M: ReviewTime
        ];

        // Append to 'Case_Applications' sheet
        await appendSheetRows(env.SHEET_ID, 'Case_Applications!A:A', [rowData], token);

        // Notify Reviewers
        await sendCaseApprovalNotification({ ...form, timestamp, uid: form.uid }, env, token);

        return { success: true };
    } catch (e) {
        throw e;
    }
}

export async function getCases(request, env) {
    try {
        const { uid, unit: requestedUnit } = await request.json();
        const token = await getAccessToken(env);

        // 1. Get User Info
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
        const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData = await metaResp.json();
        const firstSheetName = metaData.sheets[0].properties.title;

        const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
        
        // Find specific profile if unit provided, otherwise first match
        const user = staffRows.find(r => r[3] === uid && (!requestedUnit || r[0] === requestedUnit));

        if (!user) return { success: false, message: 'User not found or unit mismatch' };

        const role = user[2];
        const unit = user[0];
        const isReviewer = ROLES.SUPERVISOR_ROLES.includes(role);

        // 2. Get Case Applications
        const userName = user[1]; // Name is in Col 1

        // 2. Get Case Applications
        const meta2 = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData2 = await meta2.json();
        const sheetExists = metaData2.sheets.some(s => s.properties.title === 'Case_Applications');
        if (!sheetExists) return { success: true, cases: [] };

        const allRows = await getSheetData(env.SHEET_ID, 'Case_Applications!A1:Z', token); // Header included
        if (allRows.length < 2) return { success: true, cases: [] };

        const header = allRows[0];
        const rows = allRows.slice(1);

        const schema = {
             timestamp: ['Timestamp', '時間戳記', '填寫時間'],
             staffId: ['Staff ID', '員工編號'],
             applicant: ['Applicant', '申請人'],
             agency: ['Agency', '機構', '所屬機構'],
             area: ['Area', '區域', '個案區域'],
             caseName: ['Case Name', '個案姓名'],
             gender: ['Gender', '性別'],
             applyTypes: ['Apply Types', '申請類別'],
             devItem: ['Dev Item', '開發項目'],
             devCount: ['Dev Count', '數量'],
             status: ['Status', '狀態', '審核狀態'],
             reviewer: ['Reviewer', '審核人'],
             reviewTime: ['Review Time', '審核時間'],
             firstServiceDate: ['First Service Date', '首次服務日', '首次服務日期']
        };
        const colMap = mapHeadersToIndexes(header, schema);
        
        // Fallbacks
        if (colMap.agency === -1) colMap.agency = 3;
        if (colMap.status === -1) colMap.status = 10;
        if (colMap.applicant === -1) colMap.applicant = 2;
        if (colMap.firstServiceDate === -1) colMap.firstServiceDate = 13; // Col N
        
        // Filter Logic
        let cases = [];
        rows.forEach(row => {
            const rowUnit = row[colMap.agency]; 
            const rowApplicant = row[colMap.applicant];

            if (isReviewer) {
                if (rowUnit === unit) {
                    cases.push(mapRowToCase(row, colMap));
                }
            } else {
                 // Staff view logic: Filter by Name
                 if (rowApplicant === userName) {
                    cases.push(mapRowToCase(row, colMap));
                 }
            }
        });

        return { success: true, cases: cases, isReviewer };

    } catch (e) {
        throw e;
    }
}

function mapRowToCase(row, colMap) {
    // Helper to get safely
    const get = (key, defaultVal) => (colMap[key] >= 0 ? row[colMap[key]] : (row[defaultVal] || ''));
    
    // Fallback defaults based on original hardcoded indexes
    return {
        timestamp: get('timestamp', 0),
        staffId: get('staffId', 1),
        applicant: get('applicant', 2),
        agency: get('agency', 3),
        area: get('area', 4),
        caseName: get('caseName', 5),
        gender: get('gender', 6),
        applyTypes: get('applyTypes', 7),
        devItem: get('devItem', 8),
        devCount: get('devCount', 9),
        status: get('status', 10),
        reviewer: get('reviewer', 11),
        reviewTime: get('reviewTime', 12),
        firstServiceDate: get('firstServiceDate', 13),
        rejectReason: get('rejectReason', 14),
        devDetails: get('devDetails', 15) ? JSON.parse(get('devDetails', 15)) : []
    };
}

export async function reviewCase(request, env) {
    try {
        const { uid, applicantUid, timestamp, action, reviewerName, firstServiceDate, rejectReason, devDetails } = await request.json(); 

        const token = await getAccessToken(env);

        // Find Row - Fetch A:Z
        const rows = await getSheetData(env.SHEET_ID, 'Case_Applications!A:Z', token); 
        if (rows.length < 1) throw new Error('Sheet Empty');
        
        const header = rows[0];
        const schema = {
             timestamp: ['Timestamp', '時間戳記', '填寫時間'],
             status: ['Status', '狀態', '審核狀態'],
             reviewer: ['Reviewer', '審核人'],
             reviewTime: ['Review Time', '審核時間'],
             firstServiceDate: ['First Service Date', '首次服務日'],
             rejectReason: ['Reject Reason', '駁回原因'],
             devDetails: ['Dev Details', '開發明細']
        };
        const colMap = mapHeadersToIndexes(header, schema);
        if (colMap.timestamp === -1) colMap.timestamp = 0;
        if (colMap.status === -1) colMap.status = 10;
        if (colMap.reviewer === -1) colMap.reviewer = 11;
        if (colMap.reviewTime === -1) colMap.reviewTime = 12;
        if (colMap.firstServiceDate === -1) colMap.firstServiceDate = 13; // Col N
        if (colMap.rejectReason === -1) colMap.rejectReason = 14; // Col O
        if (colMap.devDetails === -1) colMap.devDetails = 15; // Col P

        let rowIndex = -1;
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][colMap.timestamp] === timestamp) {
                rowIndex = i + 1;
                break;
            }
        }

        if (rowIndex > -1) {
            let status = CASE_STATUS.PENDING;
            if (action === 'approve') status = CASE_STATUS.APPROVED;
            else if (action === 'reject') status = CASE_STATUS.REJECTED;
            else if (action === 'accept') status = CASE_STATUS.PROCESSING;

            const time = new Date().toISOString();

            const statusCol = colIndexToLetter(colMap.status);
            const reviewerCol = colIndexToLetter(colMap.reviewer);
            const reviewTimeCol = colIndexToLetter(colMap.reviewTime);
            const firstServiceDateCol = colIndexToLetter(colMap.firstServiceDate);
            const rejectReasonCol = colIndexToLetter(colMap.rejectReason);
            const devDetailsCol = colIndexToLetter(colMap.devDetails);
            
            // If contiguous, update in one go (K, L, M, N, O, P... wait P is 15)
            if (colMap.reviewer === colMap.status + 1 && 
                colMap.reviewTime === colMap.reviewer + 1 && 
                colMap.firstServiceDate === colMap.reviewTime + 1 &&
                colMap.rejectReason === colMap.firstServiceDate + 1 &&
                colMap.devDetails === colMap.rejectReason + 1) {
                    
                 const values = [[
                    status, 
                    reviewerName, 
                    time, 
                    (action === 'accept' ? (firstServiceDate || '') : (rows[rowIndex-1][colMap.firstServiceDate] || '')),
                    (action === 'reject' ? rejectReason : ''),
                    (devDetails ? JSON.stringify(devDetails) : '')
                 ]];
                 const updateRange = `Case_Applications!${statusCol}${rowIndex}:${devDetailsCol}${rowIndex}`;
                 const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;
                 
                 await fetch(url, {
                     method: 'PUT',
                     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify({ values: values })
                 });
            } else {
                 await updateSheetCell(env.SHEET_ID, `Case_Applications!${statusCol}${rowIndex}`, status, token);
                 await updateSheetCell(env.SHEET_ID, `Case_Applications!${reviewerCol}${rowIndex}`, reviewerName, token);
                 await updateSheetCell(env.SHEET_ID, `Case_Applications!${reviewTimeCol}${rowIndex}`, time, token);
                 if (action === 'accept' && firstServiceDate) {
                    await updateSheetCell(env.SHEET_ID, `Case_Applications!${firstServiceDateCol}${rowIndex}`, firstServiceDate, token);
                 }
                 if (action === 'reject' && rejectReason) {
                    await updateSheetCell(env.SHEET_ID, `Case_Applications!${rejectReasonCol}${rowIndex}`, rejectReason, token);
                 }
                 if (devDetails) {
                    await updateSheetCell(env.SHEET_ID, `Case_Applications!${devDetailsCol}${rowIndex}`, JSON.stringify(devDetails), token);
                 }
            }

            return { success: true };
        }

        return { success: false, message: 'Case not found' };

    } catch (e) {
        throw e;
    }
}

export async function getCaseRanking(request, env) {
    try {
        const token = await getAccessToken(env);

        // 1. Get Staff List (Name to Role/Unit mapping)
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
        const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData = await metaResp.json();
        const firstSheetName = metaData.sheets[0].properties.title;
        const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
        
        // Map: Name -> { role, unit, name }
        const staffMap = {};
        staffRows.forEach(row => {
            const name = row[1]; // Col B is Name? Check getCases: row[2] is Role, row[0] is Unit. 
            // Let's verify standard Staff_List columns from user-service or getCases.
            // getCases line 53: r[3] === uid, r[0] === unit.
            // getCases line 57: role = user[2].
            // So: 0:Unit, 1:Name, 2:Role, 3:UID.
            if (name) staffMap[name] = { unit: row[0], name: row[1], role: row[2] };
        });

        // 2. Get All Cases
        const allRows = await getSheetData(env.SHEET_ID, 'Case_Applications!A1:K', token);
        if (allRows.length < 2) return { success: true, rankings: { staff: { byOpening: [], byDev: [] }, supervisor: { byOpening: [], byDev: [] } } };

        const header = allRows[0];
        const rows = allRows.slice(1);
        
        const schema = {
            applicant: ['Applicant', '申請人', '個案申請人'],
            applyTypes: ['Apply Types', '申請類別'],
            devCount: ['Dev Count', '數量'],
            status: ['Status', '狀態']
        };
        const colMap = mapHeadersToIndexes(header, schema);
        // Defaults
        if (colMap.applicant === -1) colMap.applicant = 2;
        if (colMap.applyTypes === -1) colMap.applyTypes = 7;
        if (colMap.devCount === -1) colMap.devCount = 9;
        if (colMap.status === -1) colMap.status = 10;

        // 3. Aggregate
        const stats = {}; 

        rows.forEach(row => {
            const status = row[colMap.status]; 
            if (status !== CASE_STATUS.APPROVED) return; 

            const applicantName = row[colMap.applicant]; 
            const applyTypes = row[colMap.applyTypes] || ''; 
            
            if (!stats[applicantName]) {
                const staff = staffMap[applicantName] || {};
                stats[applicantName] = { 
                    name: applicantName, 
                    opening: 0, 
                    development: 0, 
                    role: staff.role || 'Unknown', 
                    unit: staff.unit || '' 
                };
            }

            if (applyTypes.includes('開案')) stats[applicantName].opening++;
            if (applyTypes.includes('開發')) stats[applicantName].development += parseInt(row[colMap.devCount] || 0) || 1; 
        });

        // 4. Group by Role
        const staffList = [];
        const supervisorList = [];

        Object.values(stats).forEach(s => {
            const isSupervisor = ROLES.SUPERVISOR_ROLES.includes(s.role);
            if (isSupervisor) supervisorList.push(s);
            else staffList.push(s);
        });

        // 5. Sort & Slice
        const processList = (list) => {
             // We need separate rankings for Opening and Development? 
             // Or one list? User said "列出前五名", implied maybe two lists or filterable.
             // "篩選居服員或是督導...排行"
             // Usually Opening rank and Dev rank are separate.
             // Or total? Let's return the full data and let frontend sort/display.
             // Actually, returning Top 5 for each category is safer for payload size if list is huge.
             
             // Let's sort by Opening desc
             const byOpening = [...list].sort((a, b) => b.opening - a.opening).slice(0, 5);
             // Sort by Development desc
             const byDev = [...list].sort((a, b) => b.development - a.development).slice(0, 5);
             
             return { byOpening, byDev };
        };

        return {
            success: true,
            rankings: {
                staff: processList(staffList),
                supervisor: processList(supervisorList)
            }
        };

    } catch (e) {
        throw e;
    }
}

export async function checkPendingCaseReminders(env) {
    try {
        const token = await getAccessToken(env);

        // 1. Get All Cases
        const allRows = await getSheetData(env.SHEET_ID, 'Case_Applications!A1:N', token); // Header included (up to N)
        if (!allRows || allRows.length < 2) return;

        const header = allRows[0];
        const rows = allRows.slice(1);

        const schema = {
            timestamp: ['Timestamp', '時間戳記', '填寫時間'],
            agency: ['Agency', '機構', '所屬機構'],
            applyTypes: ['Apply Types', '申請類別'],
            status: ['Status', '狀態', '審核狀態'],
            caseName: ['Case Name', '個案姓名'],
            applicant: ['Applicant', '申請人'],
            firstServiceDate: ['First Service Date', '首次服務日']
        };
        const colMap = mapHeadersToIndexes(header, schema);
        
        // Defaults
        if (colMap.timestamp === -1) colMap.timestamp = 0;
        if (colMap.agency === -1) colMap.agency = 3;
        if (colMap.applyTypes === -1) colMap.applyTypes = 7;
        if (colMap.status === -1) colMap.status = 10;
        if (colMap.caseName === -1) colMap.caseName = 5;
        if (colMap.applicant === -1) colMap.applicant = 2;
        if (colMap.firstServiceDate === -1) colMap.firstServiceDate = 13;

        // 2. Filter Targets
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reminders = [];

        rows.forEach(row => {

            const timestamp = row[colMap.timestamp];
            const unit = row[colMap.agency]; 
            const applyTypes = row[colMap.applyTypes] || ''; 
            const status = row[colMap.status] || CASE_STATUS.PENDING;
            const caseName = row[colMap.caseName];
            const applicant = row[colMap.applicant];
            const firstServiceDateStr = row[colMap.firstServiceDate];

            // 1. Weekly Reminder for Pending Cases
            if (status === CASE_STATUS.PENDING && applyTypes.includes('開案')) {
                const appDate = new Date(timestamp);
                appDate.setHours(0, 0, 0, 0);
                const diffTime = Math.abs(today - appDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 0 && diffDays % 7 === 0) {
                    reminders.push({ type: 'weekly', unit, applicant, caseName, daysPending: diffDays });
                }
            } 
            // 2. Maturity Reminder for Processing Cases (8 Weeks = 56 Days)
            else if (status === CASE_STATUS.PROCESSING && firstServiceDateStr) {
                 const firstServiceDate = new Date(firstServiceDateStr);
                 firstServiceDate.setHours(0,0,0,0);
                 
                 const diffTime = Math.abs(today - firstServiceDate);
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                 
                 // If exactly 56 days (8 weeks) or maybe periodically after? 
                 // Let's notify on day 56.
                 if (diffDays === 56) {
                      reminders.push({ type: 'maturity', unit, applicant, caseName, daysPending: diffDays });
                 }
            }
        });

        if (reminders.length === 0) return;

        // 3. Get Staff for Notifications
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
        const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData = await metaResp.json();
        const firstSheetName = metaData.sheets[0].properties.title;
        const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);

        // 4. Send Notifications Grouped by Unit (Optimization)
        // Creating a map of Unit -> Reviewers
        const unitReviewers = {};
        const targetRoles = ROLES.SUPERVISOR_ROLES;

        staffRows.forEach(row => {
            const u = row[0];
            const role = row[2];
            const uid = row[3];
            if (targetRoles.includes(role) && uid) {
                if (!unitReviewers[u]) unitReviewers[u] = [];
                unitReviewers[u].push(uid);
            }
        });

        for (const r of reminders) {
            const reviewers = unitReviewers[r.unit] || [];
            if (reviewers.length === 0) continue;

            let flexMessage;
            
            if (r.type === 'weekly') {
                 flexMessage = {
                    type: "flex",
                    altText: `⏰ 開案追蹤提醒：${r.caseName} 已申請 ${r.daysPending} 天`,
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                { type: "text", text: "開案進度追蹤", weight: "bold", color: "#DC2626", size: "xs" },
                                { type: "text", text: r.caseName, weight: "bold", size: "xl", margin: "md" },
                                { type: "text", text: `申請人：${r.applicant}`, size: "sm", color: "#666666", margin: "sm" },
                                { type: "text", text: `已過 ${r.daysPending} 天，請確認服務狀況`, size: "sm", color: "#DC2626", margin: "md", weight: "bold" }
                            ]
                        },
                        footer: {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                { type: "button", style: "primary", color: "#DC2626", action: { type: "uri", label: "查看案件", uri: "https://liff.line.me/2008645610-0MezRE9Z?view=case_review" } }
                            ]
                        }
                    }
                };
            } else if (r.type === 'maturity') {
                flexMessage = {
                    type: "flex",
                    altText: `✅ 8週達標通知：${r.caseName} 已滿8週`,
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                { type: "text", text: "開案達標通知", weight: "bold", color: "#16A34A", size: "xs" },
                                { type: "text", text: r.caseName, weight: "bold", size: "xl", margin: "md" },
                                { type: "text", text: `申請人：${r.applicant}`, size: "sm", color: "#666666", margin: "sm" },
                                { type: "text", text: `已服務滿 8 週，請進行核准！`, size: "sm", color: "#16A34A", margin: "md", weight: "bold" }
                            ]
                        },
                        footer: {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                { type: "button", style: "primary", color: "#16A34A", action: { type: "uri", label: "前往核准", uri: "https://liff.line.me/2008645610-0MezRE9Z?view=case_review" } }
                            ]
                        }
                    }
                };
            }

            await fetch('https://api.line.me/v2/bot/message/multicast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
                },
                body: JSON.stringify({
                    to: reviewers,
                    messages: [flexMessage]
                })
            });
        }

    } catch (e) {
        console.error('Reminder Job Failed:', e);
    }
}

export async function revokeCase(request, env) {
    try {
        const { uid, timestamp } = await request.json();
        const token = await getAccessToken(env);

        // 1. Get User Info (for ownership check)
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
        const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData = await metaResp.json();
        const firstSheetName = metaData.sheets[0].properties.title;
        const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
        const user = staffRows.find(r => r[3] === uid); // Find by UID
        
        if (!user) return { success: false, message: 'User not found' };
        const userName = user[1];

        // 2. Find Case
        const rows = await getSheetData(env.SHEET_ID, 'Case_Applications!A:K', token);
        if (rows.length < 2) return { success: false, message: 'No cases found' };

        const header = rows[0];
        const schema = {
            timestamp: ['Timestamp', '時間戳記', '填寫時間'],
            status: ['Status', '狀態', '審核狀態'],
            applicant: ['Applicant', '申請人']
        };
        const colMap = mapHeadersToIndexes(header, schema);
        if (colMap.timestamp === -1) colMap.timestamp = 0;
        if (colMap.status === -1) colMap.status = 10;
        if (colMap.applicant === -1) colMap.applicant = 2;

        let rowIndex = -1;
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][colMap.timestamp] === timestamp) {
                rowIndex = i + 1;
                
                // Ownership Check
                if (rows[i][colMap.applicant] !== userName) {
                     return { success: false, message: 'Permission denied' };
                }
                
                // Status Check
                if (rows[i][colMap.status] !== CASE_STATUS.PENDING) {
                     return { success: false, message: 'Cannot revoke processed case' };
                }

                break;
            }
        }

        if (rowIndex > -1) {
            const statusCol = colIndexToLetter(colMap.status);
            await updateSheetCell(env.SHEET_ID, `Case_Applications!${statusCol}${rowIndex}`, CASE_STATUS.CANCELLED, token);
            return { success: true };
        }

        return { success: false, message: 'Case not found' };
    } catch (e) {
        throw e;
    }
}
