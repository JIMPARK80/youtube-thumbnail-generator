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
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // 캐시 방지
    res.setHeader('ETag', '"styles-v2"'); // 버전 업데이트
    res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // 캐시 방지
    res.setHeader('ETag', '"script-v2"'); // 버전 업데이트
    res.sendFile(path.join(__dirname, 'script.js'));
});

// Serve other static files
app.use(express.static('.'));

// Map for tracking usage
const dailyUsage = new Map(); // For authenticated users (token-based)
const freeUsage = new Map(); // For free users (IP-based)

// Password setting (environment variable or default value)
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'family2024';

// Usage limits
const FREE_LIMIT = 3; // Free usage limit for everyone
const PREMIUM_LIMIT = 100; // Premium usage limit after login

// Usage reset function (daily at midnight) - only for premium users
function resetDailyUsage() {
    dailyUsage.clear(); // Only reset premium usage (daily)
    // freeUsage is NOT reset - it's lifetime based
    console.log('📊 Premium daily usage has been reset.');
}

// Reset premium usage daily at midnight (free usage is lifetime, not reset)
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
    
    // Extract requested number of phrases from prompt
    // Look for patterns like "Generate 3 completely independent" or "Number of phrases to generate: 3"
    let requestedCount = 3; // Default
    const generateMatch = prompt.match(/Generate\s+(\d+)\s+completely\s+independent/i);
    if (generateMatch && generateMatch[1]) {
        requestedCount = parseInt(generateMatch[1]) || 3;
    } else {
        // Try alternative pattern: "Number of phrases to generate: X"
        const countMatch = prompt.match(/Number of phrases to generate:\s*(\d+)/i);
        if (countMatch && countMatch[1]) {
            requestedCount = parseInt(countMatch[1]) || 3;
        }
    }
    
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
    
    // Return only the requested number of phrases
    return phrases.slice(0, requestedCount);
}

// Usage check function for authenticated users
function checkUsageLimit(token) {
    const today = new Date().toDateString();
    const key = `token-${token}-${today}`;
    const currentUsage = dailyUsage.get(key) || 0;
    
    return {
        current: currentUsage,
        limit: PREMIUM_LIMIT,
        remaining: Math.max(0, PREMIUM_LIMIT - currentUsage),
        exceeded: currentUsage >= PREMIUM_LIMIT,
        type: 'premium'
    };
}

// Usage check function for free users (IP-based, lifetime limit, not daily)
function checkFreeUsageLimit(clientIP) {
    // IP 기반으로 평생 3회만 사용 가능 (일자와 무관)
    const key = `free-${clientIP}`;
    const currentUsage = freeUsage.get(key) || 0;
    
    return {
        current: currentUsage,
        limit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - currentUsage),
        exceeded: currentUsage >= FREE_LIMIT,
        type: 'free'
    };
}

// Usage increment function for authenticated users
function incrementUsage(token) {
    const today = new Date().toDateString();
    const key = `token-${token}-${today}`;
    const currentUsage = dailyUsage.get(key) || 0;
    dailyUsage.set(key, currentUsage + 1);
}

// Usage increment function for free users (IP-based, lifetime)
function incrementFreeUsage(clientIP) {
    // IP 기반으로 평생 3회만 사용 가능 (일자와 무관)
    const key = `free-${clientIP}`;
    const currentUsage = freeUsage.get(key) || 0;
    freeUsage.set(key, currentUsage + 1);
}

// Store active session tokens (in production, use Redis or similar)
const activeTokens = new Set();

// API 엔드포인트
app.post('/api/generate-phrases', async (req, res) => {
    try {
        const { prompt, token } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }
        
        let usage;
        let isAuthenticated = false;
        
        // Check if user is authenticated (has valid token)
        if (token && activeTokens.has(token)) {
            isAuthenticated = true;
            // Authenticated user - check premium usage limit (100)
            usage = checkUsageLimit(token);
            if (usage.exceeded) {
                return res.status(429).json({ 
                    error: 'Today\'s usage limit has been reached. Please contact Jim Park Digital Studio to continue.',
                    code: 'PREMIUM_USAGE_EXCEEDED',
                    usage: usage
                });
            }
        } else {
            // Free user - check free usage limit (3)
            usage = checkFreeUsageLimit(clientIP);
            if (usage.exceeded) {
                return res.status(429).json({ 
                    error: 'Free usage completed. Please enter password to continue.',
                    code: 'FREE_USAGE_EXCEEDED',
                    usage: usage
                });
            }
        }
        
        console.log(`Calling Claude API... (IP: ${clientIP}, Authenticated: ${isAuthenticated}, Usage: ${usage.current + 1}/${usage.limit})`);
        const phrases = await callClaudeAPI(prompt);
        
        // Increment usage based on authentication status
        if (isAuthenticated) {
            incrementUsage(token);
            usage = checkUsageLimit(token); // Refresh usage after increment
        } else {
            incrementFreeUsage(clientIP);
            usage = checkFreeUsageLimit(clientIP); // Refresh usage after increment
        }
        
        console.log('Generated phrases:', phrases);
        
        res.json({ 
            success: true, 
            phrases: phrases,
            count: phrases.length,
            usage: usage
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
    const token = req.headers['x-session-token'] || req.query.token || '';
    
    let usage;
    if (token && activeTokens.has(token)) {
        // Authenticated user
        usage = checkUsageLimit(token);
    } else {
        // Free user
        usage = checkFreeUsageLimit(clientIP);
    }
    
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

