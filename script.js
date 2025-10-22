// Step Navigation
let currentStep = 1;
let userPassword = '';
let usageInfo = { current: 0, limit: 20, remaining: 20 };

// 비밀번호 인증 함수
function checkPassword() {
    const password = document.getElementById('passwordInput').value.trim();
    if (!password) {
        showPasswordError('비밀번호를 입력해주세요.');
        return;
    }
    
    userPassword = password;
    hidePasswordModal();
    loadUsageInfo();
}

// 비밀번호 모달 숨기기
function hidePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('usageInfo').style.display = 'flex';
}

// 비밀번호 에러 표시
function showPasswordError(message) {
    const errorEl = document.getElementById('passwordError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// 사용량 정보 로드
async function loadUsageInfo() {
    try {
        const response = await fetch('/api/usage');
        if (response.ok) {
            usageInfo = await response.json();
            updateUsageDisplay();
        }
    } catch (error) {
        console.error('사용량 정보 로드 실패:', error);
    }
}

// 사용량 표시 업데이트
function updateUsageDisplay() {
    document.getElementById('usageCount').textContent = usageInfo.current;
    document.getElementById('remainingCount').textContent = usageInfo.remaining;
    
    // 사용량이 많으면 경고 색상
    const remainingEl = document.querySelector('.usage-remaining');
    if (usageInfo.remaining <= 3) {
        remainingEl.style.background = 'rgba(220, 53, 69, 0.2)';
        remainingEl.style.borderColor = '#dc3545';
    } else {
        remainingEl.style.background = 'rgba(40, 167, 69, 0.2)';
        remainingEl.style.borderColor = '#28a745';
    }
}

function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show target step
    document.getElementById(`step${step}`).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        stepEl.classList.toggle('active', index + 1 === step);
    });
    
    currentStep = step;
}

// Target audience selection
document.addEventListener('DOMContentLoaded', () => {
    // 비밀번호 모달 표시
    document.getElementById('passwordModal').style.display = 'flex';
    
    // 비밀번호 입력 이벤트
    document.getElementById('passwordSubmit').addEventListener('click', checkPassword);
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
    
    const targetBtns = document.querySelectorAll('.target-btn');
    targetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            targetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Gender selection
    const genderBtns = document.querySelectorAll('.gender-btn');
    genderBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            genderBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Authority selection with custom input
    const authoritySelect = document.getElementById('authority');
    const customAuthorityInput = document.getElementById('customAuthority');
    
    authoritySelect.addEventListener('change', function() {
        if (this.value === '직접입력') {
            customAuthorityInput.style.display = 'block';
            customAuthorityInput.focus();
        } else {
            customAuthorityInput.style.display = 'none';
            customAuthorityInput.value = '';
        }
    });
    
    // Max length selection with custom input
    const maxLengthSelect = document.getElementById('maxLength');
    const customMaxLengthInput = document.getElementById('customMaxLength');
    
    maxLengthSelect.addEventListener('change', function() {
        if (this.value === '직접입력') {
            customMaxLengthInput.style.display = 'block';
            customMaxLengthInput.focus();
        } else {
            customMaxLengthInput.style.display = 'none';
            customMaxLengthInput.value = '';
        }
    });
});

// AI Phrase Generation with Claude API
async function generatePhrases() {
    const generateBtn = document.querySelector('.generate-btn');
    generateBtn.textContent = 'AI 생성하기...';
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    
    try {
        // Collect data from Step 1 and Step 2
        const formData = collectFormData();
        
        // Generate prompt for Claude API
        const prompt = createPrompt(formData);
        
        // Call Claude API
        const phrases = await callClaudeAPI(prompt);
        
        // Display generated phrases
        displayPhrases(phrases);
        goToStep(3);
        
    } catch (error) {
        console.error('AI 생성 실패:', error);
        alert('AI 문구 생성에 실패했습니다. 다시 시도해주세요.');
        
        // Fallback to sample phrases
        const fallbackPhrases = generateSamplePhrases();
        displayPhrases(fallbackPhrases);
        goToStep(3);
    } finally {
        generateBtn.textContent = 'AI 생성 중...';
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

// Collect form data from Step 1 and Step 2
function collectFormData() {
    const authoritySelect = document.getElementById('authority');
    const customAuthorityInput = document.getElementById('customAuthority');
    const maxLengthSelect = document.getElementById('maxLength');
    const customMaxLengthInput = document.getElementById('customMaxLength');
    
    // 권위 요소 처리 (직접입력인 경우 커스텀 값 사용)
    let authority = authoritySelect.value;
    if (authority === '직접입력' && customAuthorityInput.value.trim()) {
        authority = customAuthorityInput.value.trim();
    }
    
    // 문구 길이 처리 (직접입력인 경우 커스텀 값 사용)
    let maxLength = parseInt(maxLengthSelect.value);
    if (maxLengthSelect.value === '직접입력' && customMaxLengthInput.value) {
        maxLength = parseInt(customMaxLengthInput.value);
    }
    
    const data = {
        // Step 1: Basic Information
        videoTopic: document.getElementById('videoTopic').value.trim(),
        targetAudience: document.querySelector('.target-btn.active').dataset.target,
        gender: document.querySelector('.gender-btn.active').dataset.gender,
        
        // Step 2: Core Message
        shockPoint: document.getElementById('shockPoint').value.trim(),
        synopsis: document.getElementById('synopsis').value.trim(),
        additionalInfo: document.getElementById('additionalInfo').value.trim(),
        authority: authority,
        phraseCount: parseInt(document.getElementById('phraseCount').value),
        maxLength: maxLength,
        shockCheck: document.getElementById('shockCheck').checked,
        contentCheck: document.getElementById('contentCheck').checked
    };
    
    return data;
}

// Create prompt for Claude API
function createPrompt(data) {
    const targetLabels = {
        senior: '시니어 (50대 이상)',
        worker: '2030 직장인',
        housewife: '주부',
        all: '전체'
    };
    
    const genderLabels = {
        male: '남성',
        female: '여성',
        both: '남녀 모두'
    };
    
    let prompt = `유튜브 썸네일 문구를 생성해주세요.

**기본 정보:**
- 영상 주제: ${data.videoTopic}
- 타겟층: ${targetLabels[data.targetAudience]}
- 성별: ${genderLabels[data.gender]}

**핵심 메시지:**
- 충격 포인트: ${data.shockPoint}
- 영상 시놉시스: ${data.synopsis}
- 추가 정보: ${data.additionalInfo}
- 권위 요소: ${data.authority}

**요구사항:**
- 생성할 문구 개수: ${data.phraseCount}개
- 최대 길이: ${data.maxLength}자
- 충격 포인트 공략: ${data.shockCheck ? '예' : '아니오'}
- 충분한 내용: ${data.contentCheck ? '예' : '아니오'}

**생성 규칙:**
1. 클릭을 유도하는 자극적인 문구로 작성
2. 숫자나 통계를 활용하여 임팩트 있게 표현 (예: 20배, 300%, 3분만에)
3. 호기심을 자극하는 표현 사용
4. 타겟층에 맞는 언어와 톤 사용
5. 각 문구는 독립적이고 매력적이어야 함
6. 한국어로 작성
7. **문구 길이: 20-35자 (공백 제외) - 썸네일 최적화**
8. 각 문구는 완전히 다른 각도와 접근 방식으로 작성
9. 숫자, 통계, 시간, 비율 등을 적극 활용
10. "?", "!", "..." 등으로 호기심 유발
11. 간결하고 임팩트 있는 표현 사용

**출력 형식:**
${data.phraseCount}개의 완전히 독립적인 썸네일 문구를 생성해주세요.
각 문구는 3줄로 구성하여 작성하고, 문구 사이에는 빈 줄을 넣어주세요.
**중요: 절대 번호(1., 2., 3. 등)나 기호(-, • 등)를 사용하지 마세요.**
각 문구는 순수한 텍스트만으로 3줄을 구성하세요.
순수한 문구만 작성해주세요.

**3줄 구성 규칙:**
- 1줄: 제목/핵심 메시지 (큰 글씨)
- 2줄: 강조 문구/결과 (중간 글씨, 색상 강조)
- 3줄: 부제목/방법 (작은 글씨)

예시:
당신이 매일 마시는 건강음료가
암세포를 20배 빠르게 키웁니다
3분만에 확인 방법 공개

커피 한 잔 '이 성분' 때문에
암 발병률 300% 증가
서울대 연구팀이 밝힌 충격적 사실

생수병 뚜껑 절대 모르고
마시지 마세요
독성물질 100배 검출`;

    return prompt;
}

// Call Claude API (서버 사이드 프록시 사용)
async function callClaudeAPI(prompt) {
    try {
        // Option 1: 서버 사이드 프록시 사용 (권장)
        const response = await fetch('/api/generate-phrases', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                prompt: prompt,
                password: userPassword
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                showPasswordError('비밀번호가 올바르지 않습니다.');
                return null;
            } else if (response.status === 429) {
                alert('일일 사용량을 초과했습니다. 내일 다시 시도해주세요.');
                return null;
            }
            throw new Error(errorData.error || `서버 요청 실패: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 사용량 정보 업데이트
        if (data.usage) {
            usageInfo = data.usage;
            updateUsageDisplay();
        }
        
        return data.phrases;
        
    } catch (error) {
        console.error('서버 API 호출 실패:', error);
        
        // Option 2: 직접 API 호출 (개발/테스트용)
        // 주의: 실제 운영에서는 API 키를 클라이언트에 노출하지 마세요
        return await callClaudeAPIDirect(prompt);
    }
}

// 직접 Claude API 호출 (개발/테스트용)
async function callClaudeAPIDirect(prompt) {
    // 환경변수나 설정에서 API 키를 가져오는 것이 좋습니다
    const API_KEY = process.env.CLAUDE_API_KEY || 'your-claude-api-key-here';
    
    if (API_KEY === 'your-claude-api-key-here') {
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
        throw new Error(`API 요청 실패: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse the response to extract phrases
    let phrases = content.split('\n\n').filter(phrase => phrase.trim().length > 0);
    
    // 추가 정리: 빈 줄이나 번호 제거
    phrases = phrases.map(phrase => {
        // 번호나 기호 제거 (1., 2., - 등)
        return phrase.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim();
    }).filter(phrase => phrase.length > 0);
    
    // 문구에서 번호 패턴 제거 (문구 내부의 번호도 제거)
    phrases = phrases.map(phrase => {
        return phrase.replace(/\d+\.\s*/g, '').trim();
    });
    
    // 최대 개수 제한
    if (phrases.length > 10) {
        phrases = phrases.slice(0, 10);
    }
    
    return phrases;
}

function generateSamplePhrases() {
    const samplePhrases = [
        "당신이 매일 마시는 건강음료가\n암세포를 20배 빠르게 키웁니다\n3분만에 확인 방법 공개",
        "커피 한 잔 '이 성분' 때문에\n암 발병률 300% 증가\n서울대 연구팀이 밝힌 충격적 사실",
        "생수병 뚜껑 절대 모르고\n마시지 마세요\n독성물질 100배 검출",
        "서울대 연구팀이 밝힌\n뜨거운 60도 이상 두면\n독성물질 100배 검출",
        "의사도 모르는 숨겨진 사실\n야근도 모르고 중독자 사용\n지금도 당신은 습관적으로..."
    ];
    
    return samplePhrases;
}

function displayPhrases(phrases) {
    const container = document.getElementById('phrasesContainer');
    container.innerHTML = '';
    
    phrases.forEach((phrase, index) => {
        const phraseEl = document.createElement('div');
        phraseEl.className = 'phrase-item';
        
        // 문구 길이 확인
        const lengthInfo = checkPhraseLength(phrase);
        
        const hasWarning = index === 0 || index === 2; // Add warning to some phrases
        
        // 3줄로 파싱하고 색상 강조 적용
        const phraseLines = parsePhraseToLines(phrase);
        
        phraseEl.innerHTML = `
            <div class="phrase-header">
                <h3 class="phrase-title">문구 ${index + 1}</h3>
                <div class="phrase-meta">
                    <span class="length-info ${lengthInfo.isOptimal ? 'optimal' : 'warning'}">${lengthInfo.length}자</span>
                    ${hasWarning ? '<span class="warning-label">의문적 경고</span>' : ''}
                </div>
            </div>
            <div class="phrase-text">
                ${phraseLines.map((line, lineIndex) => 
                    `<span class="phrase-line line${lineIndex + 1}">${highlightKeywords(line)}</span>`
                ).join('')}
            </div>
            <div class="phrase-actions">
                <button class="edit-btn" data-phrase-index="${index}">수정하기</button>
            </div>
            <div class="edit-panel" style="display: none;">
                <div class="edit-inputs">
                    ${phraseLines.map((line, lineIndex) => 
                        `<input type="text" class="edit-input" data-line="${lineIndex}" value="${line}" placeholder="문구를 입력하세요">`
                    ).join('')}
                </div>
                <div class="edit-buttons">
                    <button class="save-btn" data-phrase-index="${index}">저장</button>
                    <button class="cancel-btn" data-phrase-index="${index}">취소</button>
                </div>
            </div>
        `;
        
        // Add event listeners for edit functionality
        const editBtn = phraseEl.querySelector('.edit-btn');
        const saveBtn = phraseEl.querySelector('.save-btn');
        const cancelBtn = phraseEl.querySelector('.cancel-btn');
        const editPanel = phraseEl.querySelector('.edit-panel');
        const phraseText = phraseEl.querySelector('.phrase-text');
        const editInputs = phraseEl.querySelectorAll('.edit-input');
        
        // 수정하기 버튼 클릭
        editBtn.addEventListener('click', function() {
            editPanel.style.display = 'block';
            phraseText.style.display = 'none';
            editBtn.style.display = 'none';
        });
        
        // 저장 버튼 클릭
        saveBtn.addEventListener('click', function() {
            const newLines = Array.from(editInputs).map(input => input.value.trim());
            const newPhrase = newLines.join('\n');
            
            // 문구 길이 확인
            const newLengthInfo = checkPhraseLength(newPhrase);
            
            // 문구 업데이트
            const newPhraseLines = parsePhraseToLines(newPhrase);
            phraseText.innerHTML = newPhraseLines.map((line, lineIndex) => 
                `<span class="phrase-line line${lineIndex + 1}">${highlightKeywords(line)}</span>`
            ).join('');
            
            // 길이 정보 업데이트
            const lengthInfoEl = phraseEl.querySelector('.length-info');
            lengthInfoEl.textContent = `${newLengthInfo.length}자`;
            lengthInfoEl.className = `length-info ${newLengthInfo.isOptimal ? 'optimal' : 'warning'}`;
            
            // 편집 패널 숨기기
            editPanel.style.display = 'none';
            phraseText.style.display = 'block';
            editBtn.style.display = 'block';
        });
        
        // 취소 버튼 클릭
        cancelBtn.addEventListener('click', function() {
            editPanel.style.display = 'none';
            phraseText.style.display = 'block';
            editBtn.style.display = 'block';
        });
        
        container.appendChild(phraseEl);
    });
}

function copyPhrase(phrase) {
    // Remove any HTML entities and clean the text
    const cleanPhrase = phrase.replace(/\\'/g, "'").replace(/&quot;/g, '"');
    
    navigator.clipboard.writeText(cleanPhrase).then(() => {
        // Show success message
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '복사됨!';
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#6c757d';
        }, 1500);
    }).catch(err => {
        console.error('복사 실패:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = cleanPhrase;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '복사됨!';
            btn.style.background = '#28a745';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#6c757d';
            }, 1500);
        } catch (fallbackErr) {
            alert('복사에 실패했습니다. 텍스트를 수동으로 선택해주세요.');
        }
        document.body.removeChild(textArea);
    });
}

// Form validation
function validateStep1() {
    const videoTopic = document.getElementById('videoTopic').value.trim();
    if (!videoTopic) {
        alert('영상 주제를 입력해주세요.\n예: 50대 이후, 진짜 친구는 몇 명일까?');
        return false;
    }
    return true;
}

function validateStep2() {
    const shockPoint = document.getElementById('shockPoint').value.trim();
    if (!shockPoint) {
        alert('충격 포인트를 입력해주세요.');
        return false;
    }
    return true;
}

// Enhanced step navigation with validation
function goToStep(step) {
    // Validate current step before moving
    if (currentStep === 1 && step === 2 && !validateStep1()) {
        return;
    }
    if (currentStep === 2 && step === 3 && !validateStep2()) {
        return;
    }
    
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show target step
    document.getElementById(`step${step}`).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        stepEl.classList.toggle('active', index + 1 === step);
    });
    
    currentStep = step;
}

// Simple step navigation without validation for "다음" button
function goToNextStep() {
    if (currentStep === 1) {
        goToStep(2);
    } else if (currentStep === 2) {
        generatePhrases();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set initial step
    goToStep(1);
    
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentStep < 3) {
            if (currentStep === 1 && validateStep1()) {
                goToStep(2);
            } else if (currentStep === 2 && validateStep2()) {
                generatePhrases();
            }
        }
    });
});

// Add loading states and animations
function showLoading(element) {
    element.style.opacity = '0.6';
    element.style.pointerEvents = 'none';
}

function hideLoading(element) {
    element.style.opacity = '1';
    element.style.pointerEvents = 'auto';
}

// 3줄 파싱 함수 (끊어읽기 개선)
function parsePhraseToLines(phrase) {
    // 줄바꿈으로 분리
    let lines = phrase.split('\n').filter(line => line.trim().length > 0);
    
    // 각 줄에서 번호 제거 (1., 2., 3. 등)
    lines = lines.map(line => {
        return line.replace(/^\d+\.\s*/, '').trim();
    });
    
    // 3줄이 아닌 경우 처리
    if (lines.length === 1) {
        // 한 줄인 경우 의미 단위로 끊어읽기
        const text = lines[0];
        return smartLineBreak(text);
    } else if (lines.length === 2) {
        // 2줄인 경우 빈 줄 추가
        return [lines[0], lines[1], ''];
    } else if (lines.length > 3) {
        // 3줄 초과인 경우 앞의 3줄만 사용
        return lines.slice(0, 3);
    }
    
    return lines;
}

// 끊어읽기 함수
function smartLineBreak(text) {
    // 끊어읽기 패턴들 (의미 단위로 분할)
    const breakPatterns = [
        // 조사 뒤에서 끊기
        /([가을를])\s+/g,
        /([에에서로])\s+/g,
        /([는은])\s+/g,
        /([도만])\s+/g,
        /([하고하면서])\s+/g,
        /([때문에위해])\s+/g,
        /([라고라고서])\s+/g,
        /([하면하면서])\s+/g,
        
        // 구체적인 끊어읽기 패턴
        /(커피 한 잔)\s+/g,
        /(당신이 매일)\s+/g,
        /(암세포를)\s+/g,
        /(발병률)\s+/g,
        /(서울대)\s+/g,
        /(연구팀이)\s+/g,
        /(독성물질)\s+/g,
        /(생수병)\s+/g,
        /(뚜껑)\s+/g,
        /(절대)\s+/g,
        /(마시지)\s+/g,
        /(마세요)\s+/g,
        /(확인)\s+/g,
        /(방법)\s+/g,
        /(공개)\s+/g,
        /(의사도)\s+/g,
        /(모르는)\s+/g,
        /(숨겨진)\s+/g,
        /(사실)\s+/g,
        /(중독자)\s+/g,
        /(사용)\s+/g,
        /(지금도)\s+/g,
        /(습관적으로)\s+/g,
        
        // 숫자와 단위 뒤에서 끊기
        /(\d+[%배도])\s+/g,
        /(\d+분)\s+/g,
        /(\d+년)\s+/g,
        /(\d+잔)\s+/g,
        /(\d+명)\s+/g
    ];
    
    let result = text;
    
    // 패턴 적용하여 끊어읽기 표시
    breakPatterns.forEach(pattern => {
        result = result.replace(pattern, '$1\n');
    });
    
    // 줄바꿈으로 분리
    let lines = result.split('\n').filter(line => line.trim().length > 0);
    
    // 3줄로 조정
    if (lines.length === 1) {
        // 여전히 한 줄이면 단어로 분할
        const words = lines[0].split(' ');
        if (words.length <= 6) {
            return [lines[0], '', ''];
        } else {
            const third = Math.ceil(words.length / 3);
            return [
                words.slice(0, third).join(' '),
                words.slice(third, third * 2).join(' '),
                words.slice(third * 2).join(' ')
            ];
        }
    } else if (lines.length === 2) {
        return [lines[0], lines[1], ''];
    } else if (lines.length >= 3) {
        return lines.slice(0, 3);
    }
    
    return lines;
}

// 문구 길이 확인 함수
function checkPhraseLength(phrase) {
    const cleanPhrase = phrase.replace(/\n/g, '').replace(/\s+/g, '');
    const length = cleanPhrase.length;
    
    console.log(`문구: "${phrase}"`);
    console.log(`길이: ${length}자 (공백 제외)`);
    
    return {
        phrase: phrase,
        length: length,
        isOptimal: length >= 20 && length <= 35
    };
}

// 키워드 강조 함수
function highlightKeywords(text) {
    // 강조할 키워드 패턴들
    const patterns = [
        // 주황색 강조 (숫자, 통계, 수량, 시간)
        { pattern: /(\d+[%배]?|10년|3분|1잔|1명|한 명|단 한|수많은|많은|적은|줄어든|늘어난|젊은|나이|들수록)/g, class: 'highlight-orange' },
        // 빨간색 강조 (위험, 경고, 부정적 표현, 감정)
        { pattern: /(절대|위험|독|암|발병률|300%|100배|중독|독성|잃어버린|걱정|걱정했다|걱정|위험|독|암)/g, class: 'highlight-red' },
        // 파란색 강조 (정보, 방법, 질문, 관계)
        { pattern: /(방법|확인|공개|연구|분석|조건|사실|누가|기억할까|인간관계|친구들|깊이로|시절|지금도)/g, class: 'highlight-blue' }
    ];
    
    let highlightedText = text;
    
    patterns.forEach(({ pattern, class: className }) => {
        highlightedText = highlightedText.replace(pattern, `<span class="${className}">$1</span>`);
    });
    
    return highlightedText;
}

// Add phrase templates based on target audience
function getPhraseTemplates(target) {
    const templates = {
        senior: [
            "건강한 노년을 위한 필수 지식",
            "50대 이상이 알아야 할 건강 비밀",
            "노화 방지의 핵심 포인트",
            "시니어 건강관리의 새로운 접근"
        ],
        worker: [
            "직장인 필수 생존 정보",
            "스트레스 해소의 과학적 방법",
            "업무 효율성 극대화 비법",
            "직장인 건강관리 완벽 가이드"
        ],
        housewife: [
            "주부를 위한 실용 정보",
            "가정 건강관리의 핵심",
            "육아와 살림의 균형",
            "주부 건강관리 완벽 가이드"
        ],
        all: [
            "모든 연령대가 알아야 할 정보",
            "일상생활의 숨겨진 진실",
            "건강한 삶을 위한 필수 지식",
            "삶의 질 향상을 위한 핵심 정보"
        ]
    };
    
    return templates[target] || templates.all;
}
