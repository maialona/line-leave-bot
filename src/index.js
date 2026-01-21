import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { checkUser, bindUser } from './api/user-service.js';
import { submitLeave, getLeaves, reviewLeave, cancelLeave } from './api/leave-service.js';
import { webhookHandler } from './api/webhook-handler.js';
import { submitCase, getCases, reviewCase, checkPendingCaseReminders, getCaseRanking, revokeCase } from './api/case-service.js';
import { whisperHandlers } from './api/whisper-service.js';
import { bulletinHandlers } from './api/bulletin-service.js';

const app = new Hono();

// Global CORS Middleware
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
}));

// Route Wrappers to match standard Hono (ctx = { req, env, executionCtx })
// Existing services take (request, env). Hono passes (c).
// Wrapper: c => handler(c.req.raw, c.env, c.executionCtx) 
const wrap = (handler) => async (c) => {
    try {
        const res = await handler(c.req.raw, c.env, c.executionCtx);
        // If handler returns simple object, wrap currently handled in handler?
        // Wait, existing handlers return object { success: true ... } OR a full Response?
        // Looking at index.js line 57: return new Response(JSON.stringify(result));
        // Looking at existing services: they return plain objects (mostly).
        // Exceptions: webhookHandler usage??
        // Let's check `apiHandlers` usage in old index.js:
        // if (path === '/webhook') return await apiHandlers[path](request, env); -> Returns Response directly?
        // try { const result = await apiHandlers[path]... return new Response... } -> Returns Object.

        // So Webhook returns Response. API returns Object.
        
        // Let's differentiate based on return type or explicit routes.
        
        if (Object.keys(res).some(k => k === 'success' || k === 'error' || k === 'profiles' || k === 'leaves' || k === 'cases')) {
             return c.json(res);
        }
        return c.json(res); // Default to JSON for safety if object

    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
};

// Webhook (Returns Response directly)
app.post('/webhook', async (c) => {
    return await webhookHandler(c.req.raw, c.env);
});

// User API
app.post('/api/check-user', wrap(checkUser));
app.post('/api/bind-user', wrap(bindUser));

// Leave API
app.post('/api/submit-leave', wrap(submitLeave));
app.post('/api/get-leaves', wrap(getLeaves));
app.post('/api/review-leave', wrap(reviewLeave));
app.post('/api/cancel-leave', wrap(cancelLeave));

// Case API
app.post('/api/submit-case', wrap(submitCase));
app.post('/api/get-cases', wrap(getCases));
app.post('/api/review-case', wrap(reviewCase));
app.post('/api/get-case-ranking', wrap(getCaseRanking));
app.post('/api/revoke-case', wrap(revokeCase));

// Whisper API
app.get('/api/whisper/recipients', wrap(whisperHandlers.getRecipients)); // GET? Old code was POST for all? 
// Old index.js: "if (request.method === 'POST' || path === '/webhook')" -> implies everything was POST?
// Let's assume POST to be safe as per old logic, but GET is better for fetching.
// Wait, whisperHandlers.getRecipients probably reads kv/sheet.
// Let's check: "Old: request.method === 'POST' || path === '/webhook'".
// So previously ALL API calls were treated as POST in the if block?
// Yes. The client probably sends POST.
// Let's stick to POST for compatibility unless I change frontend.
// I will keep POST for all `/api/*` to avoid breaking frontend changes right now.

app.post('/api/whisper/recipients', wrap(whisperHandlers.getRecipients));
app.post('/api/whisper/submit', wrap(whisperHandlers.submitWhisper));
app.post('/api/whisper/get', wrap(whisperHandlers.getWhispers));
app.post('/api/whisper/reply', wrap(whisperHandlers.replyWhisper));
app.post('/api/whisper/read', wrap(whisperHandlers.markAsRead));
app.post('/api/whisper/delete', wrap(whisperHandlers.deleteWhisper));

// Bulletin API
app.post('/api/bulletin/get', wrap(bulletinHandlers.getBulletins));
app.post('/api/bulletin/create', wrap(bulletinHandlers.createBulletin));
app.post('/api/bulletin/delete', wrap(bulletinHandlers.deleteBulletin));
app.post('/api/bulletin/sign', wrap(bulletinHandlers.signBulletin));
app.post('/api/bulletin/stats', wrap(bulletinHandlers.getBulletinStats));

// Refusal Report API
import { submitRefusal, getRefusalStats } from './api/refusal-service.js';
app.post('/api/submit-refusal', wrap(submitRefusal));
app.post('/api/get-refusal-stats', wrap(getRefusalStats));

// Static Assets Fallback
app.get('*', async (c) => {
    if (c.env.ASSETS) {
        return await c.env.ASSETS.fetch(c.req.raw);
    }
    return c.notFound();
});

// Error Handling
app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Global Worker Error: ' + err.message }, 500);
});

export default {
    fetch: app.fetch,
    async scheduled(event, env, ctx) {
        ctx.waitUntil(checkPendingCaseReminders(env));
    }
};
