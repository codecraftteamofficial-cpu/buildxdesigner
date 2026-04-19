const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const allowedOrigins = [
  process.env.LOCAL_FRONTEND_URL,
  process.env.PROD_FRONTEND_URL,
  process.env.FRONTEND_URL,
  "https://buildxdesigner-fork.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Allow exact matches
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // Allow ALL *.buildxdesigner.site subdomains
    if (/^https?:\/\/[^.]+\.buildxdesigner\.site$/.test(origin)) {
      callback(null, true);
      return;
    }

    // Allow ALL *.vercel.app subdomains (for preview/feature branches)
    if (/^https?:\/\/[^.]+\.vercel\.app$/.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("/{*path}", cors(corsOptions));
app.use(express.json());

// Health check to verify backend version
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "v2.0.2-final-fix",
    message: "Backend is updated and supporting anonymous checkout",
    timestamp: new Date(),
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  console.log(
    `[REQUEST RECEIVED] Method: ${req.method} URL: ${req.url} OriginalURL: ${req.originalUrl}`,
  );
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const type = status >= 400 ? "FAILED" : "SUCCESS";
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type} ${req.method} ${req.originalUrl || req.url} Status:${status} ${duration}ms\n`;

    fs.appendFile(path.join(__dirname, "logs.text"), logMessage, (err) => {
      if (err) console.error("Failed to write to logs.text:", err);
    });

    if (status >= 400) {
      console.log(
        `[RESPONSE SENT] ${type} ${req.method} ${req.originalUrl} Status:${status}`,
      );
    }
  });
  next();
});

const isProd = process.env.NODE_ENV === "production";

const FRONTEND_URL = isProd
  ? "https://buildxdesigner.site"
  : process.env.LOCAL_FRONTEND_URL;

const CALLBACK_URL = isProd
  ? "https://buildxdesigner.duckdns.org/api/auth/callback"
  : process.env.LOCAL_CALLBACK_URL;

const { SUPABASE_CLIENT_ID, SUPABASE_CLIENT_SECRET } = process.env;

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://odswfrqmqbybfkhpemsv.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseRestHeaders = () => {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!key) return null;

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
};

// Redirect for common OAuth URL mistake
app.get("/v2/oauth/authorize", (req, res) => {
  console.log(
    "[REDIRECT] User tried to access /v2/oauth/authorize directly. Redirecting to /api/auth/supabase",
  );
  res.redirect("/api/auth/supabase");
});

app.get("/api/auth/supabase", (req, res) => {
  const rootUrl = "https://api.supabase.com/v1/oauth/authorize";
  const redirectTo = req.query.redirect_to || FRONTEND_URL + "/dashboard";
  
  console.log(`[Auth Debug] /api/auth/supabase - redirect_to query: ${req.query.redirect_to}`);
  console.log(`[Auth Debug] /api/auth/supabase - Final redirectTo: ${redirectTo}`);

  const options = {
    client_id: SUPABASE_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    response_type: "code",
    state: redirectTo, // Use state to pass the target URL
  };

  const qs = new URLSearchParams(options).toString();
  res.redirect(`${rootUrl}?${qs}`);
});

app.get("/api/auth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) return res.status(400).send("No code provided");

  try {
    const tokenResponse = await axios.post(
      "https://api.supabase.com/v1/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: CALLBACK_URL,
        client_id: SUPABASE_CLIENT_ID,
        client_secret: SUPABASE_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      },
    );

    const { access_token, refresh_token } = tokenResponse.data;
    const state = req.query.state;
    
    console.log(`[Auth Debug] /api/auth/callback - Received state: ${state}`);
    
    let targetUrl = FRONTEND_URL + "/dashboard";
    
    if (state && state !== "optional-custom-state") {
      try {
        const url = new URL(state);
        // Basic validation: ensure the origin is allowed
        const origin = url.origin;
        console.log(`[Auth Debug] /api/auth/callback - Parsed origin: ${origin}`);
        console.log(`[Auth Debug] /api/auth/callback - Allowed Origins: ${JSON.stringify(allowedOrigins)}`);
        
        if (
          allowedOrigins.includes(origin) || 
          /^https?:\/\/[^.]+\.buildxdesigner\.site$/.test(origin) ||
          /^https?:\/\/[^.]+\.vercel\.app$/.test(origin)
        ) {
          console.log(`[Auth Debug] /api/auth/callback - Origin is ALLOWED`);
          targetUrl = state;
        } else {
          console.warn(`[Auth Warning] Blocked redirect to external origin: ${origin}`);
        }
      } catch (e) {
        console.error(`[Auth Error] Invalid state URL: ${state}`);
      }
    }

    console.log(`[Auth Debug] /api/auth/callback - Final redirection to: ${targetUrl}`);

    const separator = targetUrl.includes("?") ? "&" : "?";
    res.redirect(
      `${targetUrl}${separator}status=success&token=${access_token}&refresh_token=${refresh_token}`,
    );
  } catch (error) {
    console.error("OAuth Error:", error.response?.data || error.message);
    if (error.response?.data) {
      console.error("Details:", JSON.stringify(error.response.data, null, 2));
    }
    res
      .status(500)
      .send("Authentication failed. Check server logs for details.");
  }
});

app.get("/api/supabase/projects", async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  if (!accessToken) return res.status(401).send("No access token provided");

  try {
    const response = await axios.get("https://api.supabase.com/v1/projects", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    res.json(response.data);
  } catch (error) {
    console.error(
      "Fetch Projects Error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      error: "Failed to fetch projects",
      details: error.response?.data || error.message,
    });
  }
});

app.get("/api/supabase/organizations", async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  if (!accessToken) return res.status(401).send("No access token provided");

  try {
    const response = await axios.get(
      "https://api.supabase.com/v1/organizations",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    res.json(response.data);
  } catch (error) {
    console.error("Fetch Orgs Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to fetch organizations",
      details: error.response?.data || error.message,
    });
  }
});

const handleApiKeys = async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  const { ref } = req.params;

  if (!accessToken) return res.status(401).send("No access token provided");
  if (!ref) return res.status(400).send("No project ref provided");

  try {
    const response = await axios.get(
      `https://api.supabase.com/v1/projects/${ref}/api-keys`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    res.json(response.data);
  } catch (error) {
    console.error("Fetch Keys Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to fetch api keys",
      details: error.response?.data || error.message,
    });
  }
};

app.get("/api/supabase/projects/:ref/api-keys", handleApiKeys);
app.get("/supabase/projects/:ref/api-keys", handleApiKeys);

app.get("/api/supabase/schema", async (req, res) => {
  const { projectUrl, anonKey } = req.query;

  if (!projectUrl || !anonKey) {
    return res.status(400).json({ error: "Missing projectUrl or anonKey" });
  }

  try {
    // Fetch OpenAPI spec from PostgREST root
    const response = await axios.get(
      `${projectUrl}/rest/v2/?apikey=${anonKey}`,
      {
        headers: { Accept: "application/openapi+json" },
      },
    );

    const definitions = response.data.definitions;
    const tables = Object.keys(definitions).map((tableName) => {
      const def = definitions[tableName];
      return {
        name: tableName,
        columns: Object.keys(def.properties || {}).map((colName) => ({
          name: colName,
          type: def.properties[colName].type,
          format: def.properties[colName].format,
        })),
      };
    });

    res.json({ tables });
  } catch (error) {
    console.error("Fetch Schema Error:", error.message);
    res.status(500).json({
      error: "Failed to fetch schema",
      details: error.message,
    });
  }
});

// PayMongo Proxy Endpoint
app.post("/api/paymongo/checkout", async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  const { amount, description, currency = "PHP", projectId } = req.body;

  if (!amount) return res.status(400).json({ error: "Amount is required" });

  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || "https://odswfrqmqbybfkhpemsv.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc3dmcnFtcWJ5YmZraHBlbXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Nzc3ODYsImV4cCI6MjA3NDI1Mzc4Nn0.2iHmgFmD7LxXaXcPO2iOHsimgVt2uCVBFHkKCUTVA-E";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let paymongoKey = null;
    let customerData = {
      name: "Customer",
      email: "customer@example.com",
    };

    if (accessToken) {
      // 1. Authenticated Merchant (Preview/Test mode)
      const userResponse = await axios.get(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseKey,
        },
      });
      const userData = userResponse.data;
      paymongoKey = userData.user_metadata?.paymongo_key;
      customerData = {
        name: userData.user_metadata?.full_name || "Customer",
        email: userData.email || "customer@example.com",
        phone: userData.phone || userData.user_metadata?.phone,
      };
    } else if (projectId) {
      // 2. Anonymous Visitor on Published Site
      if (!serviceRoleKey) {
        return res.status(500).json({
          error:
            "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.",
          details:
            "Project owner credentials cannot be looked up for anonymous checkout.",
        });
      }

      // Fetch the project to get the owner (user_id)
      const projectResponse = await axios.get(
        `${supabaseUrl}/rest/v1/projects?projects_id=eq.${projectId}&select=user_id`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );

      if (!projectResponse.data || projectResponse.data.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }

      const userId = projectResponse.data[0].user_id;

      // Fetch the owner's metadata using Service Role (Admin client)
      const ownerResponse = await axios.get(
        `${supabaseUrl}/auth/v1/admin/users/${userId}`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );

      const ownerData = ownerResponse.data;
      paymongoKey = ownerData.user_metadata?.paymongo_key;
    } else {
      return res.status(401).json({
        error: "Authentication required or projectId must be provided.",
      });
    }

    if (!paymongoKey) {
      return res
        .status(400)
        .json({ error: "PayMongo key not found for this project's owner." });
    }

    const isTestMode = paymongoKey.startsWith("sk_test_");
    console.log(`PayMongo Mode: ${isTestMode ? "TEST" : "LIVE"}`);

    let paymentMethodTypes = req.body.payment_method_types;

    if (isTestMode) {
      paymentMethodTypes = ["card"];
      console.log("Test mode detected - restricting to card payments only");
    } else if (
      !paymentMethodTypes ||
      !Array.isArray(paymentMethodTypes) ||
      paymentMethodTypes.length === 0
    ) {
      paymentMethodTypes = ["card", "gcash", "paymaya", "grab_pay", "dob"];
    }

    const checkoutPayload = {
      data: {
        attributes: {
          billing: {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone || undefined,
          },
          line_items: [
            {
              amount: parseInt(amount) * 100,
              currency: currency,
              description: description || "Payment",
              name: description || "Product",
              quantity: 1,
              images: [],
            },
          ],
          payment_method_types: paymentMethodTypes,
          success_url: `${FRONTEND_URL}/success`,
          cancel_url: `${FRONTEND_URL}/cancel`,
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          description: description || "Payment",
        },
      },
    };

    const linkPayload = {
      data: {
        attributes: {
          amount: parseInt(amount) * 100,
          description: description || "Payment",
        },
      },
    };

    console.log("Creating Payment Link:", JSON.stringify(linkPayload, null, 2));

    const linkResponse = await axios.post(
      "https://api.paymongo.com/v1/links",
      linkPayload,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(paymongoKey + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(
      "Payment Link Response:",
      JSON.stringify(linkResponse.data, null, 2),
    );

    res.json({
      data: {
        attributes: {
          checkout_url: linkResponse.data.data.attributes.checkout_url,
        },
      },
    });
  } catch (error) {
    console.error(
      "PayMongo Error Details:",
      JSON.stringify(error.response?.data, null, 2) || error.message,
    );
    res.status(500).json({
      error: "Payment creation failed",
      details: error.response?.data?.errors || error.message,
    });
  }
});

app.get("/api/template-likes/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  const headers = getSupabaseRestHeaders();
  if (!headers) {
    return res.status(500).json({
      error: "Server misconfiguration: Supabase keys are missing.",
    });
  }

  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/template_interactions?user_id=eq.${encodeURIComponent(userId)}&select=project_id`,
      { headers },
    );

    const likedProjectIds = Array.isArray(response.data)
      ? response.data
          .map((row) => String(row.project_id || "").trim())
          .filter(Boolean)
      : [];

    res.json({ likedProjectIds });
  } catch (error) {
    console.error(
      "Fetch template likes error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      error: "Failed to fetch template likes.",
      details: error.response?.data || error.message,
    });
  }
});

app.post("/api/like-project", async (req, res) => {
  const { userId, projectId } = req.body || {};

  if (!userId || !projectId) {
    return res.status(400).json({
      error: "Both userId and projectId are required.",
    });
  }

  const headers = getSupabaseRestHeaders();
  if (!headers) {
    return res.status(500).json({
      error: "Server misconfiguration: Supabase keys are missing.",
    });
  }

  try {
    const existingResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/template_interactions?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}&select=user_id,project_id&limit=1`,
      { headers },
    );

    if (
      Array.isArray(existingResponse.data) &&
      existingResponse.data.length > 0
    ) {
      return res.json({
        success: true,
        liked: true,
        alreadyLiked: true,
      });
    }

    const insertResponse = await axios.post(
      `${SUPABASE_URL}/rest/v1/template_interactions`,
      [{ user_id: userId, project_id: projectId }],
      {
        headers: {
          ...headers,
          Prefer: "return=representation",
        },
      },
    );

    const insertedInteraction = Array.isArray(insertResponse.data)
      ? insertResponse.data[0] || null
      : null;

    // Some deployments may return an empty representation; verify persistence before returning success.
    let verifiedInteraction = insertedInteraction;
    if (!verifiedInteraction) {
      const verifyResponse = await axios.get(
        `${SUPABASE_URL}/rest/v1/template_interactions?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}&select=user_id,project_id&limit=1`,
        { headers },
      );

      verifiedInteraction = Array.isArray(verifyResponse.data)
        ? verifyResponse.data[0] || null
        : null;
    }

    if (!verifiedInteraction) {
      return res.status(500).json({
        error:
          "Like request acknowledged but no interaction row was persisted.",
      });
    }

    console.log("=== LIKE PROJECT SUCCESS ===");
    console.log("User ID:", userId);
    console.log("Project ID:", projectId);
    console.log("Verified interaction:", verifiedInteraction);
    console.log("===========================");

    return res.status(201).json({
      success: true,
      liked: true,
      alreadyLiked: false,
      interaction: verifiedInteraction,
      message: "Project liked successfully",
      like: [verifiedInteraction],
    });
  } catch (error) {
    const status = error?.response?.status;
    const details = error?.response?.data || error.message;

    if (status === 409) {
      return res.json({
        success: true,
        liked: true,
        alreadyLiked: true,
      });
    }

    console.error("Like project error:", details);
    return res.status(500).json({
      error: "Failed to like project.",
      details,
    });
  }
});

app.post("/api/unlike-project", async (req, res) => {
  const { userId, projectId } = req.body || {};

  if (!userId || !projectId) {
    return res.status(400).json({
      error: "Both userId and projectId are required.",
    });
  }

  const headers = getSupabaseRestHeaders();
  if (!headers) {
    return res.status(500).json({
      error: "Server misconfiguration: Supabase keys are missing.",
    });
  }

  try {
    const deleteResponse = await axios.delete(
      `${SUPABASE_URL}/rest/v1/template_interactions?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}`,
      { headers },
    );

    console.log("Unlike project response:", {
      userId,
      projectId,
      status: deleteResponse.status,
    });

    // Check if the interaction was actually deleted
    const verifyResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/template_interactions?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}&select=user_id,project_id&limit=1`,
      { headers },
    );

    const stillExists =
      Array.isArray(verifyResponse.data) && verifyResponse.data.length > 0;

    if (stillExists) {
      return res.status(500).json({
        error: "Unlike request acknowledged but interaction still exists.",
      });
    }

    return res.json({
      success: true,
      unliked: true,
      message: "Project unliked successfully",
    });
  } catch (error) {
    const status = error?.response?.status;
    const details = error?.response?.data || error.message;

    // If already doesn't exist, treat as success
    if (status === 404) {
      return res.json({
        success: true,
        unliked: true,
        alreadyUnliked: true,
      });
    }

    console.error("Unlike project error:", details);
    return res.status(500).json({
      error: "Failed to unlike project.",
      details,
    });
  }
});

app.get("/api/project-likes", async (req, res) => {
  const { userId } = req.query;

  console.log("=== /api/project-likes REQUEST ===");
  console.log("Query params:", req.query);
  console.log("userId from query:", userId);
  console.log("userId type:", typeof userId);
  console.log("================================");

  const headers = getSupabaseRestHeaders();
  if (!headers) {
    return res.status(500).json({
      error: "Server misconfiguration: Supabase keys are missing.",
    });
  }

  try {
    const supabaseResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/template_interactions?select=project_id,user_id,liked_at&order=liked_at.asc`,
      { headers },
    );

    const rows = Array.isArray(supabaseResponse.data)
      ? supabaseResponse.data
      : [];

    const likeCountsByProject = rows.reduce((acc, row) => {
      const projectId = String(row?.project_id || "").trim();
      if (!projectId) return acc;
      acc[projectId] = (acc[projectId] || 0) + 1;
      return acc;
    }, {});

    const projectLikes = rows.map((row) => ({
      user_id: row.user_id,
      liked_at: row.liked_at,
      project_id: row.project_id,
      likeCount: likeCountsByProject[String(row.project_id || "").trim()] || 0,
    }));

    const likes = Object.entries(likeCountsByProject).map(
      ([project_id, like_count]) => ({
        project_id,
        like_count,
      }),
    );

    let likedProjectIds = [];

    if (userId) {
      likedProjectIds = rows
        .filter(
          (row) => String(row.user_id || "").trim() === String(userId).trim(),
        )
        .map((row) => String(row.project_id || "").trim())
        .filter(Boolean);

      console.log("=== PROJECT LIKES API RESPONSE ===");
      console.log("User ID requested:", userId);
      console.log("Total rows in DB:", rows.length);
      console.log("Liked project IDs for this user:", likedProjectIds);
      console.log("All user_ids in DB:", [
        ...new Set(rows.map((r) => r.user_id)),
      ]);
      console.log("Raw rows for debugging:", rows.slice(0, 3));
      console.log("==================================");
    }

    const payload = {
      likes,
      projectLikes,
      totalLikeCount: rows.length,
      likeCountsByProject,
      likedProjectIds: likedProjectIds, // Always return it, will be empty array if no userId
    };

    console.log("Sending response with keys:", Object.keys(payload));
    console.log("likedProjectIds being sent:", payload.likedProjectIds);

    return res.json(payload);
  } catch (error) {
    console.error(
      "Fetch project likes error:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      error: "Failed to fetch project likes.",
      details: error.response?.data || error.message,
    });
  }
});

// ── Components Marketplace ──────────────────────────────────────────────────
app.get("/api/notifications/likes", async (req, res) => {
  const { userId, page = 1 } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required." });

  const limit = 5;
  const offset = (Math.max(1, parseInt(page)) - 1) * limit;

  const headers = getSupabaseRestHeaders();
  if (!headers) return res.status(500).json({ error: "Server misconfiguration" });

  try {
    const componentsResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/published_components?user_id=eq.${encodeURIComponent(userId)}&select=id,name`,
      { headers }
    );
    const components = Array.isArray(componentsResponse.data) ? componentsResponse.data : [];
    if (components.length === 0) return res.json([]);
    
    const componentMap = {};
    components.forEach(c => componentMap[c.id] = c.name);
    const componentIds = components.map(c => c.id);

    let rows = [];
    try {
      const likesResponse = await axios.get(
        `${SUPABASE_URL}/rest/v1/component_interactions?component_id=in.(${componentIds.join(",")})&user_id=neq.${encodeURIComponent(userId)}&select=id,user_id,component_id,liked_at&order=liked_at.desc&limit=${limit}&offset=${offset}`,
        { headers }
      );
      rows = Array.isArray(likesResponse.data) ? likesResponse.data : [];
      if (rows.length > 0) {
        const userIds = [...new Set(rows.map(r => r.user_id))];
        const profResponse = await axios.get(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${userIds.join(",")})&select=user_id,full_name,avatar_url`,
          { headers }
        );
        const profs = Array.isArray(profResponse.data) ? profResponse.data : [];
        rows = rows.map(r => ({
          ...r,
          profiles: profs.find(p => String(p.user_id) === String(r.user_id))
        }));
      }
    } catch (err) {
      throw err;
    }

    const notifications = rows.map(row => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        component_id: row.component_id,
        component_name: componentMap[row.component_id] || "A Component",
        user_id: row.user_id,
        liker_name: profile?.full_name || "Someone",
        liker_avatar: profile?.avatar_url || null,
        liked_at: row.liked_at
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error("Fetch notifications error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.get("/api/component-likes", async (req, res) => {
  const { userId } = req.query;

  const headers = getSupabaseRestHeaders();
  if (!headers) {
    return res.status(500).json({ error: "Server misconfiguration: Supabase keys are missing." });
  }

  try {
    const supabaseResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/component_interactions?select=component_id,user_id,liked_at&order=liked_at.asc`,
      { headers },
    );

    const rows = Array.isArray(supabaseResponse.data) ? supabaseResponse.data : [];

    const likeCountsByComponent = rows.reduce((acc, row) => {
      const componentId = String(row?.component_id || "").trim();
      if (!componentId) return acc;
      acc[componentId] = (acc[componentId] || 0) + 1;
      return acc;
    }, {});

    const componentLikes = rows.map((row) => ({
      user_id: row.user_id,
      liked_at: row.liked_at,
      component_id: row.component_id,
      likeCount: likeCountsByComponent[String(row.component_id || "").trim()] || 0,
    }));

    let likedComponentIds = [];
    if (userId) {
      likedComponentIds = rows
        .filter((row) => String(row.user_id || "").trim() === String(userId).trim())
        .map((row) => String(row.component_id || "").trim())
        .filter(Boolean);
    }

    const payload = {
      componentLikes,
      totalLikeCount: rows.length,
      likeCountsByComponent,
      likedComponentIds,
    };

    return res.json(payload);
  } catch (error) {
    console.error("Fetch component likes error:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to fetch component likes.",
      details: error.response?.data || error.message,
    });
  }
});

app.post("/api/like-component", async (req, res) => {
  const { userId, componentId } = req.body || {};
  if (!userId || !componentId) return res.status(400).json({ error: "userId and componentId required." });

  const headers = getSupabaseRestHeaders();
  if (!headers) return res.status(500).json({ error: "Server misconfiguration" });

  try {
    const existingResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/component_interactions?user_id=eq.${encodeURIComponent(userId)}&component_id=eq.${encodeURIComponent(componentId)}&limit=1`,
      { headers },
    );

    if (Array.isArray(existingResponse.data) && existingResponse.data.length > 0) {
      return res.json({ success: true, liked: true, alreadyLiked: true });
    }

    const insertResponse = await axios.post(
      `${SUPABASE_URL}/rest/v1/component_interactions`,
      [{ user_id: userId, component_id: componentId }],
      { headers: { ...headers, Prefer: "return=representation" } },
    );
    
    return res.status(201).json({ success: true, liked: true });
  } catch (error) {
    if (error?.response?.status === 409) return res.json({ success: true, liked: true, alreadyLiked: true });
    return res.status(500).json({ error: "Failed to like component.", details: error.response?.data || error.message });
  }
});

app.post("/api/unlike-component", async (req, res) => {
  const { userId, componentId } = req.body || {};
  if (!userId || !componentId) return res.status(400).json({ error: "userId and componentId required." });

  const headers = getSupabaseRestHeaders();
  if (!headers) return res.status(500).json({ error: "Server misconfiguration" });

  try {
    await axios.delete(
      `${SUPABASE_URL}/rest/v1/component_interactions?user_id=eq.${encodeURIComponent(userId)}&component_id=eq.${encodeURIComponent(componentId)}`,
      { headers },
    );
    return res.json({ success: true, unliked: true });
  } catch (error) {
    if (error?.response?.status === 404) return res.json({ success: true, unliked: true, alreadyUnliked: true });
    return res.status(500).json({ error: "Failed to unlike component.", details: error.response?.data || error.message });
  }
});

app.get("/api/marketplace/components", async (req, res) => {
  const headers = getSupabaseRestHeaders();
  if (!headers) {
    return res.status(500).json({
      error: "Server misconfiguration: Supabase keys are missing.",
    });
  }

  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/published_components?select=id,name,description,component_json,created_at,user_id,profiles(full_name,avatar_url)&order=created_at.desc`,
      { headers },
    );

    const components = Array.isArray(response.data) ? response.data : [];

    const normalized = components.map((comp) => {
      const profile = Array.isArray(comp.profiles)
        ? comp.profiles[0]
        : comp.profiles;

      return {
        id: comp.id,
        name: comp.name,
        description: comp.description || "",
        component_json: comp.component_json,
        created_at: comp.created_at,
        user_id: comp.user_id,
        creator_name: profile?.full_name || "Anonymous",
        creator_avatar: profile?.avatar_url || null,
      };
    });

    res.json(normalized);
  } catch (error) {
    console.error(
      "Fetch marketplace components error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      error: "Failed to fetch marketplace components.",
      details: error.response?.data || error.message,
    });
  }
});

// Resend Email Proxy Endpoint
app.post("/api/send-email", async (req, res) => {
  const { resendApiKey, to, subject, html, from, projectId, replyTo } =
    req.body;

  let finalApiKey = resendApiKey;

  if (!finalApiKey && projectId) {
    console.log(`Looking up Resend API key for project: ${projectId}`);
    try {
      const supabaseUrl =
        process.env.SUPABASE_URL || "https://odswfrqmqbybfkhpemsv.supabase.co";
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (serviceRoleKey) {
        const projectResponse = await axios.get(
          `${supabaseUrl}/rest/v1/projects?projects_id=eq.${projectId}&select=user_id`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          },
        );

        if (projectResponse.data && projectResponse.data.length > 0) {
          const userId = projectResponse.data[0].user_id;

          const ownerResponse = await axios.get(
            `${supabaseUrl}/auth/v1/admin/users/${userId}`,
            {
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
              },
            },
          );

          finalApiKey = ownerResponse.data.user_metadata?.resend_api_key;
          if (finalApiKey) {
            console.log(
              "Successfully retrieved Resend API key from owner metadata.",
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to look up project owner Resend key:", err.message);
    }
  }

  if (!finalApiKey) {
    return res
      .status(400)
      .json({
        error:
          "Resend API key is required (Directly or via project owner settings).",
      });
  }
  if (!to) {
    return res.status(400).json({ error: "Recipient email (to) is required." });
  }
  if (!html) {
    return res.status(400).json({ error: "Email body (html) is required." });
  }

  try {
    const response = await axios.post(
      "https://api.resend.com/emails",
      {
        from: from || "Contact Form <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject: subject || "New Form Submission",
        html: html,
        reply_to: replyTo,
      },
      {
        headers: {
          Authorization: `Bearer ${finalApiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Email sent successfully:", response.data);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error(
      "Resend Email Error:",
      JSON.stringify(error.response?.data, null, 2) || error.message,
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to send email",
      message: error.response?.data?.message || error.message,
      details: error.response?.data || error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Builder API Server is running",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use((req, res) => {
  console.log(
    `[404 MATCH FAILURE] Method: ${req.method} URL: ${req.originalUrl || req.url}`,
  );
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.originalUrl || req.url} (Logged on server)`,
    suggestion: "Check if the API path is correctly prefixed with /api",
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${isProd ? "Production" : "Development"}`);
  console.log(`FRONTEND_URL: ${FRONTEND_URL}`);
  console.log(`CALLBACK_URL: ${CALLBACK_URL}`);
});
