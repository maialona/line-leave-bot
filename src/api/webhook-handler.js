import { handlePostback, handleFollow, handleMessage } from '../utils/line-api.js';

export async function webhookHandler(request, env) {
    const body = await request.json();
    const events = body.events || [];

    for (const event of events) {
        if (event.type === 'postback') {
            await handlePostback(event, env);
        } else if (event.type === 'follow') {
            await handleFollow(event, env);
        } else if (event.type === 'message' && event.message.type === 'text') {
            await handleMessage(event, env);
        }
    }
    return new Response('OK');
}
