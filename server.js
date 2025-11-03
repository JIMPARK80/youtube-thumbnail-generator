const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with explicit routes and caching
app.get('/styles.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
    res.setHeader('ETag', '"styles-v1"');
    res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
    res.setHeader('ETag', '"script-v1"');
    res.sendFile(path.join(__dirname, 'script.js'));
});

// Serve other static files
app.use(express.static('.'));

// Map for tracking usage
const dailyUsage = new Map();

// Password setting (environment variable or default value)
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'family2024';

// Daily usage limit
const DAILY_LIMIT = 100;

// Usage reset function (daily at midnight)
function resetDailyUsage() {
    dailyUsage.clear();
    console.log('📊 Daily usage has been reset.');
}

// Reset usage daily at midnight
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        resetDailyUsage();
    }
}, 60000); // Check every minute

// Claude API call function
async function callClaudeAPI(prompt) {
    const API_KEY = process.env.CLAUDE_API_KEY;
    
    if (!API_KEY) {
        throw new Error('Claude API key is not set.');
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse the response to extract phrases
    let phrases = content.split('\n\n').filter(phrase => phrase.trim().length > 0);
    
    // Remove phrase labels like "**Phrase 1:**", "**Phrase 2:**", etc.
    phrases = phrases.map(phrase => {
        // Remove markdown bold labels (e.g., "**Phrase 1:**", "**Phrase 2:**")
        let cleaned = phrase.replace(/^\*\*Phrase\s+\d+:\*\*\s*/gmi, '');
        // Remove any other variations like "Phrase 1:", "**Phrase 1**", etc.
        cleaned = cleaned.replace(/^\*\*?Phrase\s+\d+\*\*?:\s*/gmi, '');
        cleaned = cleaned.replace(/^Phrase\s+\d+:\s*/gmi, '');
        return cleaned.trim();
    }).filter(phrase => phrase.length > 0); // Remove empty phrases after cleaning
    
    return phrases;
}

// Usage check function
function checkUsageLimit(clientIP) {
    const today = new Date().toDateString();
    const key = `${clientIP}-${today}`;
    const currentUsage = dailyUsage.get(key) || 0;
    
    return {
        current: currentUsage,
        limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - currentUsage),
        exceeded: currentUsage >= DAILY_LIMIT
    };
}

// Usage increment function
function incrementUsage(clientIP) {
    const today = new Date().toDateString();
    const key = `${clientIP}-${today}`;
    const currentUsage = dailyUsage.get(key) || 0;
    dailyUsage.set(key, currentUsage + 1);
}

// Store active session tokens (in production, use Redis or similar)
const activeTokens = new Set();

// API 엔드포인트
app.post('/api/generate-phrases', async (req, res) => {
    try {
        const { prompt, token, password } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // Verify token or password
        if (token) {
            // Token-based authentication (from login)
            if (!activeTokens.has(token)) {
                return res.status(401).json({ 
                    error: 'Invalid or expired session token.',
                    code: 'INVALID_SESSION'
                });
            }
        } else if (password) {
            // Password-based authentication (legacy)
            if (password !== ACCESS_PASSWORD) {
                return res.status(401).json({ 
                    error: 'Incorrect password.',
                    code: 'INVALID_PASSWORD'
                });
            }
        } else {
            return res.status(401).json({ 
                error: 'Authentication required. Please provide token or password.',
                code: 'AUTH_REQUIRED'
            });
        }
        
        // Usage check
        const usage = checkUsageLimit(clientIP);
        if (usage.exceeded) {
            return res.status(429).json({ 
                error: 'Daily usage limit exceeded.',
                code: 'USAGE_EXCEEDED',
                usage: usage
            });
        }
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }
        
        console.log(`Calling Claude API... (IP: ${clientIP}, Usage: ${usage.current + 1}/${DAILY_LIMIT})`);
        const phrases = await callClaudeAPI(prompt);
        
        // Increment usage
        incrementUsage(clientIP);
        
        console.log('Generated phrases:', phrases);
        
        res.json({ 
            success: true, 
            phrases: phrases,
            count: phrases.length,
            usage: checkUsageLimit(clientIP)
        });
        
    } catch (error) {
        console.error('API call failed:', error);
        res.status(500).json({ 
            error: 'Failed to generate phrases.', 
            details: error.message 
        });
    }
});

// Login API endpoint
app.post('/api/login', (req, res) => {
    try {
        const { password } = req.body;
        
        // Password verification
        if (password !== ACCESS_PASSWORD) {
            return res.status(401).json({ 
                error: 'Incorrect password.',
                code: 'INVALID_PASSWORD'
            });
        }
        
        // Generate session token (simple implementation using timestamp and random)
        const sessionToken = require('crypto').randomBytes(32).toString('hex');
        
        // Store token (in production, set expiration)
        activeTokens.add(sessionToken);
        
        // Clean up old tokens periodically (simple cleanup - in production use proper expiration)
        if (activeTokens.size > 10000) {
            // Clear half of tokens if too many (simple cleanup)
            const tokensArray = Array.from(activeTokens);
            tokensArray.slice(0, tokensArray.length / 2).forEach(token => activeTokens.delete(token));
        }
        
        // Return token
        res.json({ 
            success: true,
            token: sessionToken
        });
        
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ 
            error: 'Login failed.', 
            details: error.message 
        });
    }
});

// Usage check API
app.get('/api/usage', (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const usage = checkUsageLimit(clientIP);
    res.json(usage);
});

// Main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}.`);
    console.log(`📱 Open http://localhost:${PORT} in your browser.`);
    console.log(`🔑 Claude API key: ${process.env.CLAUDE_API_KEY ? '✅ Set' : '❌ Not set'}`);
});

module.exports = app;

