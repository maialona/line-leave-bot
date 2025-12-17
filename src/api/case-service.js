import { getAccessToken } from '../utils/google-auth.js';
import { getSheetData, updateSheetCell, appendSheetRows } from '../utils/google-sheets.js';
import { sendCaseApprovalNotification } from '../utils/line-api.js';

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
            'Pending',              // Col K: Status
            '',                     // Col L: Reviewer
            ''                      // Col M: ReviewTime
        ];

        // Append to 'Case_Applications' sheet
        await appendSheetRows(env.SHEET_ID, 'Case_Applications', [rowData], token);

        // Notify Reviewers
        await sendCaseApprovalNotification({ ...form, timestamp, uid: form.uid }, env, token);

        return { success: true };
    } catch (e) {
        throw e;
    }
}

export async function getCases(request, env) {
    try {
        const { uid } = await request.json();
        const token = await getAccessToken(env);

        // 1. Get User Info
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
        const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const metaData = await metaResp.json();
        const firstSheetName = metaData.sheets[0].properties.title;

        const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
        const user = staffRows.find(r => r[3] === uid);

        if (!user) return { success: false, message: 'User not found' };

        const role = user[2];
        const unit = user[0];
        const isReviewer = ['Supervisor', '督導', 'Business Manager', '業務負責人'].includes(role);

        // 2. Get Case Applications
        const sheetExists = metaData.sheets.some(s => s.properties.title === 'Case_Applications');
        if (!sheetExists) return { success: true, cases: [] };

        const allRows = await getSheetData(env.SHEET_ID, 'Case_Applications!A2:M', token);

        // Filter Logic
        let cases = [];
        allRows.forEach(row => {
            const rowUnit = row[3]; // Agency Col D = Index 3 (Wait, A=0, B=1, C=2, D=3. Correct)
            const rowStatus = row[10] || 'Pending';

            // If Reviewer -> See all in Unit (Pending mainly, or history?)
            // Let's return all for history, filtered by frontend
            if (isReviewer) {
                if (rowUnit === unit) {
                    cases.push(mapRowToCase(row));
                }
            } else {
                // Staff -> See own submissions? (Optional, user didn't request but good to have)
                // Need to store UID in Case Sheet? 
                // We didn't store UID in submitCase rowData!! 
                // Wait, submitCase uses form.staffId (Col B). 
                // But we usually track by UID. 
                // Let's assume for now Staff only sees what they submitted if we have a way to identify.
                // Actually, for this iteration, let's focus on Reviewer view.
            }
        });

        return { success: true, cases: cases, isReviewer };

    } catch (e) {
        throw e;
    }
}

function mapRowToCase(row) {
    return {
        timestamp: row[0],
        staffId: row[1],
        applicant: row[2],
        agency: row[3],
        area: row[4],
        caseName: row[5],
        gender: row[6],
        applyTypes: row[7],
        devItem: row[8],
        devCount: row[9],
        status: row[10],
        reviewer: row[11],
        reviewTime: row[12]
    };
}

export async function reviewCase(request, env) {
    try {
        const { uid, applicantUid, timestamp, action, reviewerName } = await request.json(); // applicantUid might be needed for notification?
        // Note: We didn't store applicant UID in the sheet, only Name. 
        // This makes notifying specific applicant harder via Push if we don't have their UID.
        // For now, we will skip notifying Applicant via Push unless we add UID to sheet.
        // OR we look up applicant UID by Name + StaffID in Staff_List.

        const token = await getAccessToken(env);

        // Find Row
        const rows = await getSheetData(env.SHEET_ID, 'Case_Applications!A:A', token); // Get timestamps
        let rowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === timestamp) {
                rowIndex = i + 1;
                break;
            }
        }

        if (rowIndex > -1) {
            const status = action === 'approve' ? 'Approved' : 'Rejected';
            const time = new Date().toISOString();

            // Update Status (Col K -> 11), Reviewer (L -> 12), Time (M -> 13)
            // Range K{row}:M{row}
            const updateRange = `Case_Applications!K${rowIndex}:M${rowIndex}`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;

            await fetch(url, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: [[status, reviewerName, time]] })
            });

            return { success: true };
        }

        return { success: false, message: 'Case not found' };

    } catch (e) {
        throw e;
    }
}

export async function checkPendingCaseReminders(env) {
    try {
        const token = await getAccessToken(env);

        // 1. Get All Cases
        const allRows = await getSheetData(env.SHEET_ID, 'Case_Applications!A2:M', token);
        if (!allRows || allRows.length === 0) return;

        // 2. Filter Targets
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reminders = [];

        allRows.forEach(row => {
            const timestamp = row[0];
            const unit = row[3]; // Agency Col D
            const applyTypes = row[7];
            const status = row[10] || 'Pending';
            const caseName = row[5];
            const applicant = row[2];

            if (status === 'Pending' && applyTypes.includes('開案')) {
                const appDate = new Date(timestamp);
                appDate.setHours(0, 0, 0, 0);

                const diffTime = Math.abs(today - appDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Weekly Reminder (e.g., 7, 14, 21...)
                if (diffDays > 0 && diffDays % 7 === 0) {
                    reminders.push({
                        unit,
                        applicant,
                        caseName,
                        daysPending: diffDays,
                        timestamp
                    });
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
        const targetRoles = ['Supervisor', '督導', 'Business Manager', '業務負責人'];

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

            const flexMessage = {
                type: "flex",
                altText: `⏰ 開案追蹤提醒：${r.caseName} 已申請 ${r.daysPending} 天`,
                contents: {
                    type: "bubble",
                    body: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: "開案進度追蹤",
                                weight: "bold",
                                color: "#DC2626", // Red for Alert
                                size: "xs"
                            },
                            {
                                type: "text",
                                text: r.caseName,
                                weight: "bold",
                                size: "xl",
                                margin: "md"
                            },
                            {
                                type: "text",
                                text: `申請人：${r.applicant}`,
                                size: "sm",
                                color: "#666666",
                                margin: "sm"
                            },
                            {
                                type: "text",
                                text: `已過 ${r.daysPending} 天，請確認服務狀況`,
                                size: "sm",
                                color: "#DC2626",
                                margin: "md",
                                weight: "bold"
                            }
                        ]
                    },
                    footer: {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                style: "primary",
                                color: "#DC2626",
                                action: {
                                    type: "uri",
                                    label: "查看案件",
                                    uri: "https://liff.line.me/2008645610-0MezRE9Z?view=case_review"
                                }
                            }
                        ]
                    }
                }
            };

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
