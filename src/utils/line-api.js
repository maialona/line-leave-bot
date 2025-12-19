
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
    // Build Detail Contents
    const detailContents = [
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
    ];

    if (data.cases && data.cases.length > 0) {
        data.cases.forEach(c => {
             const subText = c.substitute ? ' (需代班)' : '';
             detailContents.push({
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                    { type: "text", text: "個案", color: "#DC2626", size: "xs", flex: 2 },
                    { type: "text", text: `${c.caseName}${subText}`, wrap: true, color: "#374151", size: "sm", flex: 5 }
                ]
             });
        });
    }

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
            contents: detailContents
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
                        backgroundColor: "#fff2f2",
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
                                color: "#ba1c1c",
                                size: "sm",
                                align: "center"
                            }
                        ]
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        backgroundColor: "#f0fcf4",
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
                                color: "#1a8242",
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

    // Determines Sheet and Range based on Type
    const isCase = data.type === 'case';
    const sheetName = isCase ? 'Case_Applications' : 'Leave_Records';
    const range = isCase ? 'Case_Applications!A:A' : 'Leave_Records!A:K';
    
    // Find Row
    const rows = await getSheetData(env.SHEET_ID, range, token);
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
        // Case: Check Timestamp (Col 0) only? Or Timestamp + UID? Case sheet only has Applicant Name in Col C, UID is NOT in sheet.
        // But Leave has UID in Col C (index 2).
        // For Case, we rely on Timestamp (unique enough for now).
        if (rows[i][0] === data.ts) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex > -1) {
        const status = data.action === 'approve' ? 'Approved' : 'Rejected';
        const statusCol = isCase ? 'K' : 'K'; // Both happen to be K (Col 11)
        
        // Update Status
        await updateSheetCell(env.SHEET_ID, `${sheetName}!${statusCol}${rowIndex}`, status, token);
        
        // If Case, update Reviewer (L) and Time (M)
        if (isCase) {
             try {
                // Fetch Reviewer Name from LINE
                const profileResp = await fetch(`https://api.line.me/v2/bot/profile/${event.source.userId}`, {
                    headers: { 'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN }
                });
                const profile = await profileResp.json();
                const reviewerName = profile.displayName || 'Unknown';
                const time = new Date().toISOString();

                // Update L (Reviewer) and M (Time)
                // Batch update or individual cells? updateSheetCell is single cell.
                // We can use updateSheetCell twice.
                await updateSheetCell(env.SHEET_ID, `${sheetName}!L${rowIndex}`, reviewerName, token);
                await updateSheetCell(env.SHEET_ID, `${sheetName}!M${rowIndex}`, time, token);
             } catch (e) {
                 console.error('Failed to update reviewer info', e);
             }
        }

        await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
            },
            body: JSON.stringify({
                replyToken: event.replyToken,
                messages: [{ type: 'text', text: `已${status === 'Approved' ? '核准' : '駁回'} ${data.name || '案件'} 的申請` }]
            })
        });

        if (data.uid) {
            const msg = isCase 
                ? `您的開案申請 (${data.caseName}) 已${status === 'Approved' ? '核准' : '駁回'}`
                : `您的假單 (${data.name})-${data.date} 已${status === 'Approved' ? '核准' : '駁回'}`;

            await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN
                },
                body: JSON.stringify({
                    to: data.uid,
                    messages: [{ type: 'text', text: msg }]
                })
            });
        }
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
        text: "您好～很高興為您服務！😊\n請點擊下方選單按鈕，讓我協助您進行相關操作～",
        quickReply: {
            items: [
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "🏠 入口",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z"
                    }
                },
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "📢 布告欄",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z?view=bulletin"
                    }
                },
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "📝 請假",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z?view=leave"
                    }
                },
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "📂 開案/開發",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z?view=dev_apply"
                    }
                },
                {
                    type: "action",
                    action: {
                        type: "uri",
                        label: "💬 悄悄話",
                        uri: "https://liff.line.me/2008645610-0MezRE9Z?view=whisper"
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

// Whisper Notifications
export async function sendWhisperNotification(recipientUid, senderName, subject, env, isAnonymous) {
    const token = env.LINE_CHANNEL_ACCESS_TOKEN;
    const liffUrl = "https://liff.line.me/2008645610-0MezRE9Z"; 

    const displayName = isAnonymous ? "🤫 匿名" : senderName;

    const message = {
        type: "flex",
        altText: "收到新的悄悄話",
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [{ type: "text", text: "New Whisper", weight: "bold", color: "#1DB446" }]
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: `From: ${displayName}`, size: "sm", color: "#555555" },
                    { type: "text", text: `Subject: ${subject}`, size: "md", weight: "bold", margin: "md", wrap: true }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "uri", label: "查看內容", uri: liffUrl },
                        style: "primary",
                        color: "#4F46E5"
                    }
                ]
            }
        }
    };
    
    await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ to: recipientUid, messages: [message] })
    });
}

export async function sendWhisperReplyNotification(originalSenderUid, replierName, subject, env) {
    const token = env.LINE_CHANNEL_ACCESS_TOKEN;
    const liffUrl = "https://liff.line.me/2008645610-0MezRE9Z";

    const message = {
        type: "flex",
        altText: "您的悄悄話有新回覆",
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [{ type: "text", text: "New Reply", weight: "bold", color: "#1DB446" }]
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: `Replier: ${replierName}`, size: "sm", color: "#555555" },
                    { type: "text", text: `Subject: ${subject}`, size: "md", weight: "bold", margin: "md", wrap: true } // Subject might be long
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "uri", label: "查看回覆", uri: liffUrl },
                        style: "primary",
                        color: "#4F46E5"
                    }
                ]
            }
        }
    };
    
    await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ to: originalSenderUid, messages: [message] })
    });
}
// Bulletin Notifications
export async function sendBulletinNotification(uids, bulletin, env) {
    if (!uids || uids.length === 0) return;

    const token = env.LINE_CHANNEL_ACCESS_TOKEN;
    const liffUrl = "https://liff.line.me/2008645610-0MezRE9Z?view=bulletin";

    // Priority Color
    const isHigh = bulletin.priority === 'High';
    const headerColor = isHigh ? "#EF4444" : "#10B981"; // Red or Green
    const headerText = isHigh ? "📢 重要公告" : "📢 新公告";

    const message = {
        type: "flex",
        altText: `[公告] ${bulletin.title}`,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: headerText, weight: "bold", color: "#FFFFFF", size: "lg" }
                ],
                backgroundColor: headerColor
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: bulletin.title, weight: "bold", size: "xl", wrap: true, color: "#1F2937" },
                    { 
                        type: "box", 
                        layout: "baseline", 
                        margin: "md", 
                        contents: [
                            { type: "text", text: "分類", color: "#9CA3AF", size: "xs", flex: 2 },
                            { type: "text", text: bulletin.category, color: "#4B5563", size: "sm", flex: 5 }
                        ] 
                    },
                    { 
                        type: "box", 
                        layout: "baseline", 
                        margin: "sm", 
                        contents: [
                            { type: "text", text: "發布者", color: "#9CA3AF", size: "xs", flex: 2 },
                            { type: "text", text: bulletin.author, color: "#4B5563", size: "sm", flex: 5 }
                        ] 
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "uri", label: "查看詳細內容", uri: liffUrl },
                        style: "primary",
                        color: headerColor
                    }
                ]
            }
        }
    };

    // Multicast (Max 500 per request)
    // We assume < 500 for now. If > 500, need chunking.
    await fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ to: uids, messages: [message] })
    });
}
