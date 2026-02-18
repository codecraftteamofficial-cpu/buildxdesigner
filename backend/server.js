const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const allowedOrigins = [
    process.env.LOCAL_FRONTEND_URL,
    process.env.PROD_FRONTEND_URL,
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());


app.use((req, res, next) => {
    const start = Date.now();
    console.log(`[REQUEST RECEIVED] Method: ${req.method} URL: ${req.url} OriginalURL: ${req.originalUrl}`);
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const type = status >= 400 ? 'FAILED' : 'SUCCESS';
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${type} ${req.method} ${req.originalUrl || req.url} Status:${status} ${duration}ms\n`;

        fs.appendFile(path.join(__dirname, 'logs.text'), logMessage, (err) => {
            if (err) console.error('Failed to write to logs.text:', err);
        });

        if (status >= 400) {
            console.log(`[RESPONSE SENT] ${type} ${req.method} ${req.originalUrl} Status:${status}`);
        }
    });
    next();
});

const isProd = process.env.NODE_ENV === 'production';

const FRONTEND_URL = isProd
    ? 'https://buildxdesigner.site'
    : process.env.LOCAL_FRONTEND_URL;

const CALLBACK_URL = isProd
    ? 'https://buildxdesigner.duckdns.org/api/auth/callback'
    : process.env.LOCAL_CALLBACK_URL;

const {
    SUPABASE_CLIENT_ID,
    SUPABASE_CLIENT_SECRET
} = process.env;

// Redirect for common OAuth URL mistake
app.get('/v2/oauth/authorize', (req, res) => {
    console.log('[REDIRECT] User tried to access /v2/oauth/authorize directly. Redirecting to /api/auth/supabase');
    res.redirect('/api/auth/supabase');
});

app.get('/api/auth/supabase', (req, res) => {
    const rootUrl = 'https://api.supabase.com/v1/oauth/authorize';
    const options = {
        client_id: SUPABASE_CLIENT_ID,
        redirect_uri: CALLBACK_URL,
        response_type: 'code',
        state: 'optional-custom-state'
        // Note: 'scope' parameter is deprecated. Scopes are now configured when creating the OAuth app in Supabase dashboard
    };

    const qs = new URLSearchParams(options).toString();
    res.redirect(`${rootUrl}?${qs}`);
});

app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) return res.status(400).send("No code provided");

    try {
        const tokenResponse = await axios.post(
            'https://api.supabase.com/v1/oauth/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: CALLBACK_URL,
                client_id: SUPABASE_CLIENT_ID,
                client_secret: SUPABASE_CLIENT_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 10000
            }
        );

        const { access_token, refresh_token } = tokenResponse.data;

        res.redirect(`${FRONTEND_URL}/dashboard?status=success&token=${access_token}&refresh_token=${refresh_token}`);
    } catch (error) {
        console.error("OAuth Error:", error.response?.data || error.message);
        if (error.response?.data) {
            console.error("Details:", JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).send("Authentication failed. Check server logs for details.");
    }
});

app.get('/api/supabase/projects', async (req, res) => {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) return res.status(401).send("No access token provided");

    try {
        const response = await axios.get('https://api.supabase.com/v1/projects', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch Projects Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to fetch projects",
            details: error.response?.data || error.message
        });
    }
});

app.get('/api/supabase/organizations', async (req, res) => {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) return res.status(401).send("No access token provided");

    try {
        const response = await axios.get('https://api.supabase.com/v1/organizations', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch Orgs Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to fetch organizations",
            details: error.response?.data || error.message
        });
    }
});

const handleApiKeys = async (req, res) => {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const { ref } = req.params;

    if (!accessToken) return res.status(401).send("No access token provided");
    if (!ref) return res.status(400).send("No project ref provided");

    try {
        const response = await axios.get(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch Keys Error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to fetch api keys",
            details: error.response?.data || error.message
        });
    }
};

app.get('/api/supabase/projects/:ref/api-keys', handleApiKeys);
app.get('/supabase/projects/:ref/api-keys', handleApiKeys);

app.get('/api/supabase/schema', async (req, res) => {
    const { projectUrl, anonKey } = req.query;

    if (!projectUrl || !anonKey) {
        return res.status(400).json({ error: "Missing projectUrl or anonKey" });
    }

    try {
        // Fetch OpenAPI spec from PostgREST root
        const response = await axios.get(`${projectUrl}/rest/v2/?apikey=${anonKey}`, {
            headers: { 'Accept': 'application/openapi+json' }
        });

        const definitions = response.data.definitions;
        const tables = Object.keys(definitions).map(tableName => {
            const def = definitions[tableName];
            return {
                name: tableName,
                columns: Object.keys(def.properties || {}).map(colName => ({
                    name: colName,
                    type: def.properties[colName].type,
                    format: def.properties[colName].format
                }))
            };
        });

        res.json({ tables });
    } catch (error) {
        console.error("Fetch Schema Error:", error.message);
        res.status(500).json({
            error: "Failed to fetch schema",
            details: error.message
        });
    }
});

// PayMongo Proxy Endpoint
app.post('/api/paymongo/checkout', async (req, res) => {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const { amount, description, currency = 'PHP', projectId } = req.body;

    if (!amount) return res.status(400).json({ error: "Amount is required" });

    try {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://odswfrqmqbybfkhpemsv.supabase.co';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc3dmcnFtcWJ5YmZraHBlbXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Nzc3ODYsImV4cCI6MjA3NDI1Mzc4Nn0.2iHmgFmD7LxXaXcPO2iOHsimgVt2uCVBFHkKCUTVA-E';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        let paymongoKey = null;
        let customerData = {
            name: "Customer",
            email: "customer@example.com"
        };

        if (accessToken) {
            // 1. Authenticated Merchant (Preview/Test mode)
            const userResponse = await axios.get(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    apikey: supabaseKey
                }
            });
            const userData = userResponse.data;
            paymongoKey = userData.user_metadata?.paymongo_key;
            customerData = {
                name: userData.user_metadata?.full_name || "Customer",
                email: userData.email || "customer@example.com",
                phone: userData.phone || userData.user_metadata?.phone
            };
        } else if (projectId) {
            // 2. Anonymous Visitor on Published Site
            if (!serviceRoleKey) {
                return res.status(500).json({
                    error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.",
                    details: "Project owner credentials cannot be looked up for anonymous checkout."
                });
            }

            // Fetch the project to get the owner (user_id)
            const projectResponse = await axios.get(`${supabaseUrl}/rest/v1/projects?projects_id=eq.${projectId}&select=user_id`, {
                headers: {
                    apikey: serviceRoleKey,
                    Authorization: `Bearer ${serviceRoleKey}`
                }
            });

            if (!projectResponse.data || projectResponse.data.length === 0) {
                return res.status(404).json({ error: "Project not found" });
            }

            const userId = projectResponse.data[0].user_id;

            // Fetch the owner's metadata using Service Role (Admin client)
            const ownerResponse = await axios.get(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
                headers: {
                    apikey: serviceRoleKey,
                    Authorization: `Bearer ${serviceRoleKey}`
                }
            });

            const ownerData = ownerResponse.data;
            paymongoKey = ownerData.user_metadata?.paymongo_key;
        } else {
            return res.status(401).json({ error: "Authentication required or projectId must be provided." });
        }

        if (!paymongoKey) {
            return res.status(400).json({ error: "PayMongo key not found for this project's owner." });
        }

        const isTestMode = paymongoKey.startsWith('sk_test_');
        console.log(`PayMongo Mode: ${isTestMode ? 'TEST' : 'LIVE'}`);

        let paymentMethodTypes = req.body.payment_method_types;

        if (isTestMode) {
            paymentMethodTypes = ["card"];
            console.log("Test mode detected - restricting to card payments only");
        } else if (!paymentMethodTypes || !Array.isArray(paymentMethodTypes) || paymentMethodTypes.length === 0) {
            paymentMethodTypes = ["card", "gcash", "paymaya", "grab_pay", "dob"];
        }

        const checkoutPayload = {
            data: {
                attributes: {
                    billing: {
                        name: customerData.name,
                        email: customerData.email,
                        phone: customerData.phone || undefined
                    },
                    line_items: [
                        {
                            amount: parseInt(amount) * 100,
                            currency: currency,
                            description: description || "Payment",
                            name: description || "Product",
                            quantity: 1,
                            images: []
                        }
                    ],
                    payment_method_types: paymentMethodTypes,
                    success_url: `${FRONTEND_URL}/success`,
                    cancel_url: `${FRONTEND_URL}/cancel`,
                    send_email_receipt: true,
                    show_description: true,
                    show_line_items: true,
                    description: description || "Payment"
                }
            }
        };

        const linkPayload = {
            data: {
                attributes: {
                    amount: parseInt(amount) * 100,
                    description: description || "Payment"
                }
            }
        };

        console.log("Creating Payment Link:", JSON.stringify(linkPayload, null, 2));

        const linkResponse = await axios.post('https://api.paymongo.com/v1/links', linkPayload, {
            headers: {
                Authorization: `Basic ${Buffer.from(paymongoKey + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Payment Link Response:", JSON.stringify(linkResponse.data, null, 2));

        res.json({
            data: {
                attributes: {
                    checkout_url: linkResponse.data.data.attributes.checkout_url
                }
            }
        });

    } catch (error) {
        console.error("PayMongo Error Details:", JSON.stringify(error.response?.data, null, 2) || error.message);
        res.status(500).json({
            error: "Payment creation failed",
            details: error.response?.data?.errors || error.message
        });
    }
});



app.get('/', (req, res) => {
    res.json({
        status: "ok",
        message: "Builder API Server is running",
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
    console.log(`[404 MATCH FAILURE] Method: ${req.method} URL: ${req.originalUrl || req.url}`);
    res.status(404).json({
        error: "Not Found",
        message: `Cannot ${req.method} ${req.originalUrl || req.url} (Logged on server)`,
        suggestion: "Check if the API path is correctly prefixed with /api"
    });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${isProd ? 'Production' : 'Development'}`);
    console.log(`FRONTEND_URL: ${FRONTEND_URL}`);
    console.log(`CALLBACK_URL: ${CALLBACK_URL}`);
});