const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 사용량 추적을 위한 Map
const dailyUsage = new Map();

// 비밀번호 설정 (환경변수 또는 기본값)
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'family2024';

// 일일 사용량 제한
const DAILY_LIMIT = 20;

// 사용량 초기화 함수 (매일 자정)
function resetDailyUsage() {
    dailyUsage.clear();
    console.log('📊 일일 사용량이 초기화되었습니다.');
}

// 매일 자정에 사용량 초기화
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        resetDailyUsage();
    }
}, 60000); // 1분마다 체크

// Claude API 호출 함수
async function callClaudeAPI(prompt) {
    const API_KEY = process.env.CLAUDE_API_KEY;
    
    if (!API_KEY) {
        throw new Error('Claude API 키가 설정되지 않았습니다.');
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
        throw new Error(`Claude API 오류: ${response.status} - ${errorData.error?.message || '알 수 없는 오류'}`);
    }
    
    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse the response to extract phrases
    const phrases = content.split('\n\n').filter(phrase => phrase.trim().length > 0);
    
    return phrases;
}

// 사용량 확인 함수
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

// 사용량 증가 함수
function incrementUsage(clientIP) {
    const today = new Date().toDateString();
    const key = `${clientIP}-${today}`;
    const currentUsage = dailyUsage.get(key) || 0;
    dailyUsage.set(key, currentUsage + 1);
}

// API 엔드포인트
app.post('/api/generate-phrases', async (req, res) => {
    try {
        const { prompt, password } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // 비밀번호 확인
        if (password !== ACCESS_PASSWORD) {
            return res.status(401).json({ 
                error: '비밀번호가 올바르지 않습니다.',
                code: 'INVALID_PASSWORD'
            });
        }
        
        // 사용량 확인
        const usage = checkUsageLimit(clientIP);
        if (usage.exceeded) {
            return res.status(429).json({ 
                error: '일일 사용량을 초과했습니다.',
                code: 'USAGE_EXCEEDED',
                usage: usage
            });
        }
        
        if (!prompt) {
            return res.status(400).json({ error: '프롬프트가 필요합니다.' });
        }
        
        console.log(`Claude API 호출 중... (IP: ${clientIP}, 사용량: ${usage.current + 1}/${DAILY_LIMIT})`);
        const phrases = await callClaudeAPI(prompt);
        
        // 사용량 증가
        incrementUsage(clientIP);
        
        console.log('생성된 문구:', phrases);
        
        res.json({ 
            success: true, 
            phrases: phrases,
            count: phrases.length,
            usage: checkUsageLimit(clientIP)
        });
        
    } catch (error) {
        console.error('API 호출 실패:', error);
        res.status(500).json({ 
            error: '문구 생성에 실패했습니다.', 
            details: error.message 
        });
    }
});

// 사용량 확인 API
app.get('/api/usage', (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const usage = checkUsageLimit(clientIP);
    res.json(usage);
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`📱 브라우저에서 http://localhost:${PORT} 를 열어보세요.`);
    console.log(`🔑 Claude API 키 설정: ${process.env.CLAUDE_API_KEY ? '✅ 설정됨' : '❌ 설정 필요'}`);
});

module.exports = app;

