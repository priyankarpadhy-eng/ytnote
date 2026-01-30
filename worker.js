
import { GoogleGenerativeAI } from "@google/generative-ai";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Global CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        // Handle OPTIONS
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // ROUTE: /exchangeNotionToken
        if (url.pathname === "/exchangeNotionToken" && request.method === "POST") {
            return await handleExchangeNotionToken(request, env, corsHeaders);
        }
        // ROUTE: /exportToNotion
        if (url.pathname === "/exportToNotion" && request.method === "POST") {
            return await handleExportToNotion(request, env, corsHeaders);
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    },
};

// --- HANDLERS ---

async function handleExchangeNotionToken(request, env, corsHeaders) {
    try {
        const { code, redirectUri } = await request.json();

        if (!code || !redirectUri) {
            return new Response(JSON.stringify({ error: "Missing code or redirectUri" }), { status: 400, headers: corsHeaders });
        }

        const clientId = env.NOTION_CLIENT_ID;
        const clientSecret = env.NOTION_CLIENT_SECRET;

        const encoded = btoa(`${clientId}:${clientSecret}`);

        const response = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${encoded}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri
            })
        });

        const data = await response.json();

        // Return tokens to client to store in Firestore securely via client-side SDK
        // (Since worker can't easily access Firestore via admin SDK without complex setup, 
        // we will verify user heavily on client or pass back strictly needed info)
        // Ideally, we'd use Firebase REST API here to write to Firestore, 
        // but to keep it simple and migration-friendly, we will return the tokens to the client 
        // and let the Authorized Client write it to their own user document.
        // SECURITY NOTE: This exposes access_token to the client momentarily. 
        // Since the client is the owner of the integration, this is acceptable for this architecture.

        return new Response(JSON.stringify(data), { headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleExportToNotion(request, env, corsHeaders) {
    try {
        // User sends us the ACCESS TOKEN directly in this simplified worker model, 
        // OR we use the logic below to fetch logic if we had strict backend storage.
        // For Worker simplicity + Client writing to Firestore: Client will pass access_token.
        // Ideally: Client passes ID token -> Worker verifies -> Worker uses REST API to get stored token.
        // Simplification for migration: Client sends access_token.

        const body = await request.json();
        const { access_token, title, blocks } = body;
        // blocks: array of prepared Notion blocks from client

        if (!access_token) return new Response(JSON.stringify({ error: "Missing access token" }), { status: 401, headers: corsHeaders });

        // 1. Search for a parent page
        const searchResponse = await fetch("https://api.notion.com/v1/search", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                filter: { property: "object", value: "page" },
                page_size: 1
            })
        });

        const searchData = await searchResponse.json();
        if (searchData.results.length === 0) {
            return new Response(JSON.stringify({ error: "No shared pages found." }), { status: 400, headers: corsHeaders });
        }
        const parentPageId = searchData.results[0].id;

        // 2. Create Page
        const createResponse = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                parent: { page_id: parentPageId },
                properties: {
                    title: {
                        title: [{ type: "text", text: { content: title || "Lecture Notes" } }]
                    }
                },
                children: blocks
            })
        });

        const createData = await createResponse.json();
        return new Response(JSON.stringify({ success: true, url: createData.url }), { headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}
