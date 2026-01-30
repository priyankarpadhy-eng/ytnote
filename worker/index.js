/**
 * LectureSnap AI Worker
 * Cloudflare Worker for high-performance, low-cost AI analysis via OpenRouter.
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Handle CORS
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // Only allow POST on root
        if (request.method !== "POST" || url.pathname !== "/") {
            // If they hit / with GET, show 404 or 405. 
            // If they hit /foo, show 404.
            if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
            return new Response("Not Found", { status: 404, headers: corsHeaders });
        }

        try {
            const { images } = await request.json();

            if (!images || !Array.isArray(images)) {
                return new Response("No images provided", { status: 400, headers: corsHeaders });
            }

            const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://lecturesnaap.web.app",
                    "X-Title": "LectureSnap",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    // PRIMARY: Gemini 2.0 Flash (Fastest & Best Vision)
                    model: "google/gemini-2.0-flash-lite-preview-02-05:free",
                    extra_body: {
                        "models": [
                            "qwen/qwen-2.5-vl-72b-instruct:free", // High Intelligence Vision
                            "meta-llama/llama-3.2-11b-vision-instruct:free", // Reliable Fallback
                            "google/gemini-2.0-pro-exp-02-05:free", // Strong Reasoning
                            "microsoft/phi-3.5-vision-instruct" // Lightweight Backup
                        ],
                        "route": "fallback"
                    },
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Analyze these screenshots. Create a study guide. Return JSON with 'topic', 'summary', 'flashcards' (array of {q, a, h}), and 'mindmap' (Mermaid syntax)." },
                                ...images.map(url => ({ type: "image_url", image_url: { url } }))
                            ]
                        }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            const data = await openRouterResponse.json();

            if (!openRouterResponse.ok) {
                return new Response(JSON.stringify(data), {
                    status: openRouterResponse.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            return new Response(data.choices[0].message.content, {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    },
};
