const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// --- NOTION OAUTH FUNCTION ---
exports.exchangeNotionToken = onRequest({
    cors: true,
    secrets: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"]
}, async (req, res) => {
    // 1. Verify User (from Authorization header)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let uid;
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;
    } catch (e) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // 2. Extract Data
    const { code, redirectUri } = req.body;
    if (!code || !redirectUri) {
        return res.status(400).json({ error: "Missing code or redirectUri" });
    }

    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Notion Secrets Missing!");
        return res.status(500).json({ error: "Server misconfiguration" });
    }

    // 3. Exchange Token with Notion
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    try {
        const response = await axios.post("https://api.notion.com/v1/oauth/token", {
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri
        }, {
            headers: {
                "Authorization": `Basic ${encoded}`,
                "Content-Type": "application/json"
            }
        });

        const data = response.data;
        // Expected: access_token, workspace_id, etc.

        // 4. Store Securely
        await admin.firestore().collection("users").doc(uid).collection("integrations").doc("notion").set({
            access_token: data.access_token,
            workspace_id: data.workspace_id,
            workspace_name: data.workspace_name || "Notion Workspace",
            bot_id: data.bot_id,
            connectedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.json({ success: true });

    } catch (err) {
        console.error("Notion Exchange Error:", err.response ? err.response.data : err.message);
        const errorMsg = err.response && err.response.data && err.response.data.error
            ? err.response.data.error
            : "Failed to exchange token";
        return res.status(400).json({ error: errorMsg });
    }
});

// --- EXPORT TO NOTION ---
exports.exportToNotion = onRequest({
    cors: true,
}, async (req, res) => {
    // 1. Verify User
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    let uid;
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }

    const { noteIds, title } = req.body;

    // 2. Get Access Token
    const db = admin.firestore();
    const integrationSnap = await db.collection("users").doc(uid).collection("integrations").doc("notion").get();

    if (!integrationSnap.exists || !integrationSnap.data().access_token) {
        return res.status(400).json({ error: "Notion not connected" });
    }

    const { access_token } = integrationSnap.data();

    // 3. Find a Parent Page (User must have shared at least one page)
    let parentPageId;
    try {
        const searchResponse = await axios.post("https://api.notion.com/v1/search", {
            filter: { property: "object", value: "page" },
            page_size: 1
        }, {
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            }
        });

        if (searchResponse.data.results.length === 0) {
            return res.status(400).json({ error: "No pages shared with LectureSnap. Please go to Notion, click '...', 'Add connections', and select LectureSnap." });
        }
        parentPageId = searchResponse.data.results[0].id;

    } catch (err) {
        return res.status(500).json({ error: "Failed to search Notion pages: " + err.message });
    }

    // 4. Create the Page
    try {
        // Construct Blocks from Notes
        let children = [];

        // Add a header
        children.push({
            object: "block",
            type: "heading_1",
            heading_1: {
                rich_text: [{ type: "text", text: { content: title || "Lecture Notes" } }]
            }
        });

        for (const noteId of noteIds) {
            const noteDoc = await db.collection("users").doc(uid).collection("notes").doc(noteId).get();
            if (noteDoc.exists) {
                const note = noteDoc.data();

                // Timestamp Header
                if (note.timestampFormatted) {
                    children.push({
                        object: "block",
                        type: "heading_3",
                        heading_3: {
                            rich_text: [{ type: "text", text: { content: note.timestampFormatted } }]
                        }
                    });
                }

                // Image
                if (note.thumbnail) {
                    children.push({
                        object: "block",
                        type: "image",
                        image: {
                            type: "external",
                            external: { url: note.thumbnail }
                        }
                    });
                }

                // Note Content
                if (note.content) {
                    children.push({
                        object: "block",
                        type: "paragraph",
                        paragraph: {
                            rich_text: [{ type: "text", text: { content: note.content } }]
                        }
                    });
                }

                // Divider
                children.push({ object: 'block', type: 'divider', divider: {} });
            }
        }

        const createResponse = await axios.post("https://api.notion.com/v1/pages", {
            parent: { page_id: parentPageId },
            properties: {
                title: {
                    title: [{ type: "text", text: { content: title || "Exported Notes" } }]
                }
            },
            children: children
        }, {
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            }
        });

        return res.json({ success: true, url: createResponse.data.url });

    } catch (err) {
        console.error("Notion Export Error:", err.response?.data || err.message);
        return res.status(500).json({ error: "Failed to create Notion page: " + (err.response?.data?.message || err.message) });
    }
});

exports.capture = require('./capture').capture;
