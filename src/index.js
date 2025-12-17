import { indexHtml } from './views/index.html.js';
import { checkUser, bindUser } from './api/user-service.js';
import { submitLeave, getLeaves, reviewLeave, cancelLeave } from './api/leave-service.js';
import { webhookHandler } from './api/webhook-handler.js';
import { submitCase, getCases, reviewCase, checkPendingCaseReminders } from './api/case-service.js';
import { whisperHandlers } from './api/whisper-service.js';

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

            // 1. Serve Frontend
            if (request.method === 'GET' && (path === '/' || path === '/index.html')) {
                return new Response(indexHtml, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
                });
            }

            // 2. API Routes
            if (request.method === 'POST') {
                const apiHandlers = {
                    '/api/check-user': checkUser,
                    '/api/bind-user': bindUser,
                    '/api/submit-leave': submitLeave,
                    '/api/get-leaves': getLeaves,
                    '/api/review-leave': reviewLeave,
                    '/api/cancel-leave': cancelLeave,
                    '/api/submit-case': submitCase,
                    '/api/get-cases': getCases, // New
                    '/api/review-case': reviewCase, // New
                    '/api/whisper/recipients': whisperHandlers.getRecipients,
                    '/api/whisper/submit': whisperHandlers.submitWhisper,
                    '/api/whisper/get': whisperHandlers.getWhispers,
                    '/api/whisper/reply': whisperHandlers.replyWhisper,
                    '/webhook': webhookHandler
                };

                if (apiHandlers[path]) {
                    if (path === '/webhook') {
                        // Webhook returns Response object directly
                        return await apiHandlers[path](request, env);
                    }

                    try {
                        const result = await apiHandlers[path](request, env);
                        // Standard API returns JSON Object, we wrap it here
                        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                    } catch (e) {
                        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
                    }
                }
            }

            return new Response(JSON.stringify({ error: 'Not Found', path: path }), { status: 404, headers: corsHeaders });
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Global Worker Error: ' + e.message, stack: e.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil(checkPendingCaseReminders(env));
    }
};
