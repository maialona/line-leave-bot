import { checkUser, bindUser } from './api/user-service.js';
import { submitLeave, getLeaves, reviewLeave, cancelLeave } from './api/leave-service.js';
import { webhookHandler } from './api/webhook-handler.js';
import { submitCase, getCases, reviewCase, checkPendingCaseReminders } from './api/case-service.js';
import { whisperHandlers } from './api/whisper-service.js';
import { bulletinHandlers } from './api/bulletin-service.js';

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const path = url.pathname;

            // CORS Headers
            const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            };

            if (request.method === 'OPTIONS') {
                return new Response(null, { headers: corsHeaders });
            }

            // 1. API Routes
            if (request.method === 'POST' || path === '/webhook') {
                const apiHandlers = {
                    '/api/check-user': checkUser,
                    '/api/bind-user': bindUser,
                    '/api/submit-leave': submitLeave,
                    '/api/get-leaves': getLeaves,
                    '/api/review-leave': reviewLeave,
                    '/api/cancel-leave': cancelLeave,
                    '/api/submit-case': submitCase,
                    '/api/get-cases': getCases,
                    '/api/review-case': reviewCase,
                    '/api/whisper/recipients': whisperHandlers.getRecipients,
                    '/api/whisper/submit': whisperHandlers.submitWhisper,
                    '/api/whisper/get': whisperHandlers.getWhispers,
                    '/api/whisper/reply': whisperHandlers.replyWhisper,
                    '/api/whisper/read': whisperHandlers.markAsRead, // New
                    '/api/whisper/delete': whisperHandlers.deleteWhisper,
                    '/api/bulletin/get': bulletinHandlers.getBulletins,
                    '/api/bulletin/create': bulletinHandlers.createBulletin,
                    '/api/bulletin/delete': bulletinHandlers.deleteBulletin,
                    '/webhook': webhookHandler
                };

                if (apiHandlers[path]) {
                    if (path === '/webhook') {
                         return await apiHandlers[path](request, env);
                    }
                    try {
                        const result = await apiHandlers[path](request, env);
                        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                    } catch (e) {
                         return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
                    }
                }
            }

            // 2. Serve Frontend (Assets) logic
            // Fallback to ASSETS if available
            try {
                if (env.ASSETS) {
                    return await env.ASSETS.fetch(request);
                }
            } catch (e) {
                // If ASSETS fetch fails or env.ASSETS undefined
            }

            return new Response('Not Found', { status: 404 });
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Global Worker Error: ' + e.message, stack: e.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil(checkPendingCaseReminders(env));
    }
};
