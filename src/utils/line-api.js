
import { getSheetData, updateSheetCell } from './google-sheets.js';
import { getAccessToken } from './google-auth.js';

export async function sendApprovalNotification(data, proofUrl, timestamp, env, token) {
    // 1. Get Applicant's Unit
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
    const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
    const metaData = await metaResp.json();
    const firstSheetName = metaData.sheets[0].properties.title;

    const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
    const applicant = staffRows.find(r => r[3] === data.uid);

    if (!applicant) return;
    const unit = applicant[0];

    // 2. Find Supervisors in SAME Unit
    const supervisors = staffRows
        .filter(row => row[0] === unit && ['Supervisor', '督導'].includes(row[2]) && row[3])
        .map(row => row[3]);

    if (supervisors.length === 0) return;

    // Build Body Contents
    const bodyContents = [
        {
            type: "box",
            layout: "horizontal",
            contents: [
                { type: "text", text: "請假審核", weight: "bold", color: "#4F46E5", size: "xs" },
                { type: "text", text: "待處理", align: "end", color: "#F59E0B", size: "xs", weight: "bold" }
            ],
            margin: "none"
        },
        {
            type: "text",
            text: data.name,
            weight: "bold",
            size: "3xl",
            margin: "sm",
            color: "#1F2937"
        },
        {
            type: "text",
            text: unit,
            size: "sm",
            color: "#6B7280",
            margin: "xs"
        },
        {
            type: "separator",
            margin: "lg",
            color: "#E5E7EB"
        },
        {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            backgroundColor: "#F9FAFB",
            cornerRadius: "md",
            paddingAll: "md",
            contents: [
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        { type: "text", text: "假別", color: "#9CA3AF", size: "xs", flex: 2 },
                        { type: "text", text: data.leaveType, wrap: true, color: "#4B5563", size: "sm", flex: 5, weight: "bold" }
                    ]
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        { type: "text", text: "日期", color: "#9CA3AF", size: "xs", flex: 2 },
                        { type: "text", text: data.date, wrap: true, color: "#4B5563", size: "sm", flex: 5 }
                    ]
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        { type: "text", text: "事由", color: "#9CA3AF", size: "xs", flex: 2 },
                        { type: "text", text: data.reason, wrap: true, color: "#374151", size: "sm", flex: 5 }
                    ]
                }
            ]
        }
    ];

    // Condition: Only show proof button if NOT '事假'
    if (data.leaveType !== '事假') {
        bodyContents.push({
            type: "button",
            action: { type: "uri", label: "📎 查看證明文件", uri: proofUrl || "https://line.me" },
            style: "link",
            height: "sm",
            color: "#4F46E5",
            margin: "sm"
        });
    }

    // FIX: Clean JSON structure to prevent syntax errors
    const flexMessage = {
        type: "flex",
        altText: "📋 您有一筆新的請假申請待審核",
        contents: {
            type: "bubble",
            size: "mega",
            body: {
                type: "box",
                layout: "vertical",
                contents: bodyContents
            },
            footer: {
                type: "box",
                layout: "horizontal",
                spacing: "md",
                contents: [
                    {
                        type: "box",
                        layout: "vertical",
                        backgroundColor: "#ffc9c9",
                        cornerRadius: "md",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "40px",
                        action: {
                            type: "postback",
                            label: "駁回",
                            data: JSON.stringify({ action: "reject", ts: timestamp, uid: data.uid, name: data.name, date: data.date }),
                        },
                        contents: [
                            {
                                type: "text",
                                text: "駁回",
                                color: "#fc6161ff",
                                size: "sm",
                                align: "center"
                            }
                        ]
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        backgroundColor: "#c3fae8",
                        cornerRadius: "md",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "40px",
                        action: {
                            type: "postback",
                            label: "核准",
                            data: JSON.stringify({ action: "approve", ts: timestamp, uid: data.uid, name: data.name, date: data.date })
                        },
                        contents: [
                            {
                                type: "text",
                                text: "核准",
                                color: "#12b886",
                                size: "sm",
                                align: "center"
                            }
                        ]
                    }
                ]
            },
            styles: {
                footer: { separator: false }
            }
        }
    };

    const resp = await fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
        },
        body: JSON.stringify({
            to: supervisors,
            messages: [flexMessage]
        })
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`LINE 通知發送失敗: ${errText}`);
    }
}

export async function handlePostback(event, env) {
    const data = JSON.parse(event.postback.data);
    const token = await getAccessToken(env);

    const rows = await getSheetData(env.SHEET_ID, 'Leave_Records!A:K', token);
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === data.ts && rows[i][2] === data.uid) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex > -1) {
        const status = data.action === 'approve' ? 'Approved' : 'Rejected';
        await updateSheetCell(env.SHEET_ID, `Leave_Records!K${rowIndex}`, status, token);

        await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
            },
            body: JSON.stringify({
                replyToken: event.replyToken,
                messages: [{ type: 'text', text: `已${status === 'Approved' ? '核准' : '駁回'} ${data.name} 的申請` }]
            })
        });

        await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
            },
            body: JSON.stringify({
                to: data.uid,
                messages: [{ type: 'text', text: `您的假單 (${data.name})-${data.date} 已${status === 'Approved' ? '核准' : '駁回'}` }]
            })
        });
    }
}

export async function handleFollow(event, env) {
    const welcomeMsg = {
        type: "text",
        text: "歡迎使用204府城大師請假系統！\n\n請點擊下方連結進入系統進行綁定與請假：\nhttps://liff.line.me/2008645610-0MezRE9Z"
    };

    await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
        },
        body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [welcomeMsg]
        })
    });
}

export async function handleMessage(event, env) {
    const quickReply = {
        type: "text",
        text: "請選擇服務：",
        quickReply: {
            items: [
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "📝 請假申請",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z?tab=apply"
                    }
                },
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "📋 我的紀錄",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z?tab=my_records"
                    }
                }
            ]
        }
    };

    await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
        },
        body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [quickReply]
        })
    });
}

export async function sendCaseApprovalNotification(data, env, token) {
    // 1. Get Applicant's Unit (Recalculate or pass it? Better fetch fresh)
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`;
    const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
    const metaData = await metaResp.json();
    const firstSheetName = metaData.sheets[0].properties.title;

    const staffRows = await getSheetData(env.SHEET_ID, `${firstSheetName}!A2:F`, token);
    const applicant = staffRows.find(r => r[3] === data.uid);

    if (!applicant) return;
    const unit = applicant[0];

    // 2. Find Supervisors & Business Managers in SAME Unit
    // Role is at index 2. Check for 'Supervisor', '督導', 'Business Manager', '業務負責人'
    const targetRoles = ['Supervisor', '督導', 'Business Manager', '業務負責人'];
    const reviewers = staffRows
        .filter(row => row[0] === unit && targetRoles.includes(row[2]) && row[3])
        .map(row => row[3]);

    if (reviewers.length === 0) return;

    // 3. Build Flex Message
    const typesStr = data.applyTypes.join(', ');
    const devInfo = data.devItem ? `\n開發: ${data.devItem} x${data.devCount}` : '';

    const flexMessage = {
        type: "flex",
        altText: "📋 您有一筆新的開案申請待審核",
        contents: {
            type: "bubble",
            size: "mega",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            { type: "text", text: "開案申請", weight: "bold", color: "#059669", size: "xs" },
                            { type: "text", text: "待審核", align: "end", color: "#F59E0B", size: "xs", weight: "bold" }
                        ]
                    },
                    {
                        type: "text",
                        text: data.applicant, // Applicant Name
                        weight: "bold",
                        size: "xxl",
                        margin: "sm",
                        color: "#1F2937"
                    },
                    {
                        type: "text",
                        text: `${unit} • ${data.area}`,
                        size: "sm",
                        color: "#6B7280",
                        margin: "xs"
                    },
                    { type: "separator", margin: "lg", color: "#E5E7EB" },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        backgroundColor: "#F0FDF4", // Green tint
                        cornerRadius: "md",
                        paddingAll: "md",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                spacing: "sm",
                                contents: [
                                    { type: "text", text: "個案", color: "#059669", size: "xs", flex: 2 },
                                    { type: "text", text: `${data.caseName} (${data.gender})`, color: "#374151", size: "sm", flex: 5, weight: "bold" }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                spacing: "sm",
                                contents: [
                                    { type: "text", text: "類別", color: "#059669", size: "xs", flex: 2 },
                                    { type: "text", text: typesStr + devInfo, wrap: true, color: "#374151", size: "sm", flex: 5 }
                                ]
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "horizontal",
                spacing: "md",
                contents: [
                    {
                        type: "button",
                        style: "primary",
                        color: "#059669",
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
