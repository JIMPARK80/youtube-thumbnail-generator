// Step Navigation
let currentStep = 1;
let sessionToken = sessionStorage.getItem('sessionToken') || ''; // Session token (used instead of password)
let usageInfo = { current: 0, limit: 3, remaining: 3, type: 'free' }; // Default to free usage

// Password authentication function (session token method)
async function checkPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput.value.trim();
    
    if (!password) {
        const errorMsg = (typeof t === 'function') ? t('passwordRequired') : 'Please enter the password.';
        showPasswordError(errorMsg);
        return;
    }
    
    try {
        // Login request to server
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.error || 'Incorrect password.';
            showPasswordError(errorMsg);
            return;
        }
        
        const data = await response.json();
        
        // Store session token (using sessionStorage - automatically deleted when tab closes)
        sessionToken = data.token;
        sessionStorage.setItem('sessionToken', sessionToken);
        
        hidePasswordModal();
        
        // Load usage info asynchronously (prevent UI blocking)
        // This will now load premium usage (100)
        setTimeout(() => {
            loadUsageInfo();
        }, 100);
    } catch (error) {
        console.error('Login failed:', error);
        showPasswordError('Login failed. Please try again.');
    }
}

// Hide password modal
function hidePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('usageInfo').style.display = 'flex';
}

// Show password error
function showPasswordError(message) {
    const errorEl = document.getElementById('passwordError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// Show password modal when free usage is exhausted
function showPasswordModalForFreeLimit() {
    const modal = document.getElementById('passwordModal');
    const modalTitle = modal.querySelector('h2');
    const modalText = modal.querySelector('p');
    
    if (modalTitle) {
        modalTitle.textContent = '🔐 Free Usage Completed';
    }
    if (modalText) {
        modalText.textContent = 'You have used all 3 free generations. Please enter password to continue (100 daily generations for subscribers/friends).';
    }
    
    modal.style.display = 'flex';
}

// Show premium limit message
function showPremiumLimitMessage() {
    alert('Today\'s usage limit has been reached. Please contact Jim Park Digital Studio to continue.');
}

// Load usage info (performance optimized)
async function loadUsageInfo() {
    try {
        // Set request timeout (5 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const headers = {};
        if (sessionToken) {
            headers['x-session-token'] = sessionToken;
        }
        
        const response = await fetch(`/api/usage?token=${sessionToken || ''}`, {
            signal: controller.signal,
            cache: 'no-cache', // Prevent caching
            headers: headers
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const serverUsage = await response.json();
            // Ensure usage info has correct structure
            usageInfo = {
                current: serverUsage.current || 0,
                limit: serverUsage.limit || (serverUsage.type === 'premium' ? 100 : 3),
                remaining: serverUsage.remaining || 0,
                exceeded: serverUsage.exceeded || false,
                type: serverUsage.type || 'free'
            };
            console.log('Usage info loaded:', usageInfo); // Debug log
            updateUsageDisplay();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Usage info load timeout');
        } else {
            console.error('Usage info load failed:', error);
        }
    }
}

// Update usage display
function updateUsageDisplay() {
    const usageCountEl = document.getElementById('usageCount');
    const remainingCountEl = document.getElementById('remainingCount');
    const usageTextEl = document.querySelector('.usage-text');
    const remainingTextEl = document.querySelector('.usage-remaining');
    
    const usageType = usageInfo.type || 'free';
    // Use server's limit value, with fallback based on type
    let limit = usageInfo.limit;
    if (!limit || limit <= 0) {
        limit = (usageType === 'premium' ? 100 : 3);
    }
    // Set prefix based on usage type (no "Today's" - free is lifetime, premium is daily)
    const prefix = usageType === 'premium' ? 'Premium (Password required): ' : 'Free: ';
    
    if (usageCountEl) {
        usageCountEl.textContent = usageInfo.current;
    }
    if (remainingCountEl) {
        remainingCountEl.textContent = usageInfo.remaining;
    }
    
    // Update usage text with type prefix (NO "Today's" text)
    if (usageTextEl) {
        // Clear any existing text first
        usageTextEl.textContent = '';
        // Set new content without "Today's"
        usageTextEl.innerHTML = `${prefix}<span id="usageCount">${usageInfo.current}</span>/${limit}`;
    }
    if (remainingTextEl) {
        remainingTextEl.innerHTML = `Remaining: <span id="remainingCount">${usageInfo.remaining}</span>`;
    }
    
    // Warning color if usage is high
    if (remainingTextEl) {
        const warningThreshold = usageType === 'premium' ? 10 : 1;
        if (usageInfo.remaining <= warningThreshold) {
            remainingTextEl.style.background = 'rgba(220, 53, 69, 0.2)';
            remainingTextEl.style.borderColor = '#dc3545';
        } else {
            remainingTextEl.style.background = 'rgba(40, 167, 69, 0.2)';
            remainingTextEl.style.borderColor = '#28a745';
        }
    }
    
    // Auto-show password modal when free usage is exhausted (remaining = 0)
    if (usageType === 'free' && usageInfo.remaining === 0 && !sessionToken) {
        // Only show if not already authenticated and modal is not already visible
        const passwordModal = document.getElementById('passwordModal');
        if (passwordModal && passwordModal.style.display !== 'flex') {
            setTimeout(() => {
                showPasswordModalForFreeLimit();
            }, 500); // Small delay to ensure UI is updated first
        }
    }
}

function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show target step
    document.getElementById('step' + step).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        stepEl.classList.toggle('active', index + 1 === step);
    });
    
    currentStep = step;
}

// Target audience selection
document.addEventListener('DOMContentLoaded', () => {
    // Don't show password modal on initial load - allow free usage first
    // Only show modal when free usage is exhausted
    if (sessionToken) {
        hidePasswordModal();
        loadUsageInfo();
    } else {
        // Hide password modal initially, allow free usage
        hidePasswordModal();
        loadUsageInfo();
    }
    
    // Password input events
    document.getElementById('passwordSubmit').addEventListener('click', checkPassword);
    
    // Close modal button
    document.getElementById('closePasswordModal').addEventListener('click', hidePasswordModal);
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
    
    // Password visibility toggle function
    function setupPasswordToggle() {
        const togglePasswordBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('passwordInput');
        
        if (togglePasswordBtn && passwordInput) {
            // Remove existing event listeners (prevent duplicates)
            const newToggleBtn = togglePasswordBtn.cloneNode(true);
            togglePasswordBtn.parentNode.replaceChild(newToggleBtn, togglePasswordBtn);
            
            // Support both click and touch events
            function togglePasswordVisibility(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const input = document.getElementById('passwordInput');
                const btn = document.getElementById('togglePassword');
                
                if (input && btn) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        btn.textContent = '🙈';
                        btn.setAttribute('aria-label', 'Hide password');
                    } else {
                        input.type = 'password';
                        btn.textContent = '👁️';
                        btn.setAttribute('aria-label', 'Show password');
                    }
                }
            }
            
            // Support multiple event types (click, touch)
            const btn = document.getElementById('togglePassword');
            btn.addEventListener('click', togglePasswordVisibility, { capture: true });
            btn.addEventListener('touchend', function(e) {
                e.preventDefault();
                togglePasswordVisibility(e);
            }, { capture: true });
            
            // Also support mouse down (more reliable click detection)
            btn.addEventListener('mousedown', function(e) {
                e.preventDefault();
            });
        }
    }
    
    // Initial setup
    setupPasswordToggle();
    
    // Re-setup when modal is displayed (just in case)
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        // Detect when modal is displayed using MutationObserver
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const modal = document.getElementById('passwordModal');
                    if (modal && modal.style.display === 'flex') {
                        setTimeout(setupPasswordToggle, 100);
                    }
                }
            });
        });
        observer.observe(passwordModal, { attributes: true, attributeFilter: ['style'] });
    }
    
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
    
    // Max length selection with custom input
    const maxLengthSelect = document.getElementById('maxLength');
    const customMaxLengthInput = document.getElementById('customMaxLength');
    
    maxLengthSelect.addEventListener('change', function() {
        // Handle both translated "Custom" and original "Custom"
        const customInputValue = (typeof t === 'function') ? t('customInput') : 'Custom';
        if (this.value === 'Custom' || this.value === customInputValue || this.selectedOptions[0]?.textContent.includes('Custom')) {
            customMaxLengthInput.style.display = 'block';
            customMaxLengthInput.focus();
        } else {
            customMaxLengthInput.style.display = 'none';
            customMaxLengthInput.value = '';
        }
    });
    
    // Initialize the application
    // Clear form fields to prevent browser autocomplete (multiple methods)
    function clearFormFields() {
        const videoTopic = document.getElementById('videoTopic');
        const shockPoint = document.getElementById('shockPoint');
        const synopsis = document.getElementById('synopsis');
        const additionalInfo = document.getElementById('additionalInfo');
        
        // Clear values forcefully
        if (videoTopic) {
            videoTopic.value = '';
            videoTopic.blur();
            videoTopic.focus();
            videoTopic.blur();
        }
        if (shockPoint) {
            shockPoint.value = '';
            shockPoint.blur();
        }
        if (synopsis) {
            synopsis.value = '';
            synopsis.blur();
        }
        if (additionalInfo) {
            additionalInfo.value = '';
            additionalInfo.blur();
        }
    }
    
    // Wait for DOM to be fully ready
    setTimeout(() => {
        // Clear immediately
        clearFormFields();
        
        // Clear again multiple times to catch browser autocomplete at different stages
        setTimeout(clearFormFields, 50);
        setTimeout(clearFormFields, 200);
        setTimeout(clearFormFields, 500);
        setTimeout(clearFormFields, 1000);
    }, 100);
    
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

// AI Phrase Generation with Claude API
async function generatePhrases() {
    // Check session token (get from sessionStorage if not available)
    // Note: Session token is optional - free users can use API without token
    if (!sessionToken) {
        sessionToken = sessionStorage.getItem('sessionToken') || '';
    }
    
    const generateBtn = document.querySelector('.generate-btn') || document.querySelector('.regenerate-btn');
    const generateText = (typeof t === 'function') ? t('generate') : 'Next (Generating with AI )';
    if (generateBtn) {
        generateBtn.textContent = generateText;
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;
    }
    
    try {
        // Collect data from Step 1 and Step 2
        const formData = collectFormData();
        
        // Generate prompt for Claude API
        const prompt = createPrompt(formData);
        
        // Call Claude API
        let phrases;
        try {
            phrases = await callClaudeAPI(prompt);
        } catch (apiError) {
            // Handle API call errors
            console.error('API call error:', apiError);
            
            // Handle usage exceeded errors - don't show sample phrases, show appropriate modal
            if (apiError.message === 'FREE_USAGE_EXCEEDED' || apiError.message === 'PREMIUM_USAGE_EXCEEDED' || apiError.message === 'USAGE_EXCEEDED') {
                // Usage exceeded - already handled in callClaudeAPI (shows modal or alert)
                return;
            } else if (apiError.message === 'INVALID_SESSION') {
                // Session expired - clear token and try as free user
                sessionStorage.removeItem('sessionToken');
                sessionToken = '';
                console.log('Session expired. Retrying as free user.');
                // Retry without token (will use free usage)
                phrases = await callClaudeAPI(prompt);
            } else {
                // Re-throw other errors (handled in upper catch)
                throw apiError;
            }
        }
        
        // Error if phrases is null (this should not normally happen)
        if (!phrases) {
            throw new Error('Failed to generate phrases. No server response.');
        }
        
        // Error if phrases is not an array or is empty
        if (!Array.isArray(phrases) || phrases.length === 0) {
            throw new Error('No phrases generated.');
        }
        
        // Display generated phrases
        displayPhrases(phrases);
        goToStep(3);
        
    } catch (error) {
        console.error('AI generation failed:', error);
        console.error('Error details:', error.stack);
        
        // Handle authentication errors
        if (error.message === 'INVALID_SESSION') {
            // Session expired - clear token and try as free user
            sessionStorage.removeItem('sessionToken');
            sessionToken = '';
            // Don't show password modal, just retry (will use free usage)
            console.log('Session expired. Continuing as free user.');
            // Continue to sample phrases fallback
        }
        
        if (error.message === 'USAGE_EXCEEDED' || error.message === 'FREE_USAGE_EXCEEDED' || error.message === 'PREMIUM_USAGE_EXCEEDED') {
            // Usage exceeded - already handled (password modal or alert shown)
            return;
        }
        
        // Replace other errors with sample phrases
        console.log('Error occurred. Using sample phrases:', error.message);
        const fallbackPhrases = generateSamplePhrases();
        displayPhrases(fallbackPhrases);
        goToStep(3);
    } finally {
        const generateBtn = document.querySelector('.generate-btn') || document.querySelector('.regenerate-btn');
        if (generateBtn) {
            const generateText = (typeof t === 'function') ? t('generate') : 'Next (Generating with AI )';
            generateBtn.textContent = generateText;
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
        }
    }
}

// Collect form data from Step 1 and Step 2
function collectFormData() {
    const maxLengthSelect = document.getElementById('maxLength');
    const customMaxLengthInput = document.getElementById('customMaxLength');
    const videoTopicEl = document.getElementById('videoTopic');
    const shockPointEl = document.getElementById('shockPoint');
    const synopsisEl = document.getElementById('synopsis');
    const phraseCountEl = document.getElementById('phraseCount');
    const shockCheckEl = document.getElementById('shockCheck');
    const targetBtn = document.querySelector('.target-btn.active');
    const genderBtn = document.querySelector('.gender-btn.active');
    
    // Handle phrase length (use custom value if Custom is selected)
    let maxLength = 20; // Default value
    if (maxLengthSelect) {
        maxLength = parseInt(maxLengthSelect.value) || 20;
        // Handle both translated "Custom" and original "Custom"
        const customInputValue = (typeof t === 'function') ? t('customInput') : 'Custom';
        if ((maxLengthSelect.value === 'Custom' || maxLengthSelect.value === customInputValue || isNaN(maxLength)) && customMaxLengthInput && customMaxLengthInput.value) {
            maxLength = parseInt(customMaxLengthInput.value) || 20;
        }
    }
    
    const data = {
        // Step 1: Basic Information
        videoTopic: videoTopicEl ? videoTopicEl.value.trim() : '',
        targetAudience: targetBtn ? targetBtn.dataset.target : 'all',
        gender: genderBtn ? genderBtn.dataset.gender : 'both',
        
        // Step 2: Core Message
        shockPoint: shockPointEl ? shockPointEl.value.trim() : '',
        synopsis: synopsisEl ? synopsisEl.value.trim() : '',
        authority: '', // Authority element removed
        phraseCount: phraseCountEl ? parseInt(phraseCountEl.value) || 3 : 3,
        maxLength: maxLength,
        shockCheck: shockCheckEl ? shockCheckEl.checked : false
    };
    
    return data;
}

// Input language detection function
function detectInputLanguage(text) {
    if (!text || text.trim().length === 0) {
        return 'ko'; // Default is Korean
    }
    
    // English pattern (more than 50% English alphabets)
    const englishPattern = /[a-zA-Z]/g;
    const koreanPattern = /[가-힣]/g;
    
    const englishMatches = (text.match(englishPattern) || []).length;
    const koreanMatches = (text.match(koreanPattern) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    
    // English if English is more, otherwise Korean
    if (totalChars > 0 && englishMatches / totalChars > 0.5) {
        return 'en';
    }
    
    return 'ko';
}

// Create prompt for Claude API
function createPrompt(data) {
    // Detect input language (check videoTopic, shockPoint, synopsis)
    const inputTexts = [
        data.videoTopic,
        data.shockPoint,
        data.synopsis
    ].filter(text => text && text.trim().length > 0);
    
    let detectedLanguage = 'ko';
    if (inputTexts.length > 0) {
        // Detect language for each input text
        const languageScores = inputTexts.map(text => detectInputLanguage(text));
        const englishCount = languageScores.filter(lang => lang === 'en').length;
        const koreanCount = languageScores.filter(lang => lang === 'ko').length;
        
        // Generate in English if English input is more
        // If same count, generate in English if there's at least one English input (handle mixed input)
        if (englishCount > koreanCount || (englishCount > 0 && koreanCount === 0)) {
            detectedLanguage = 'en';
        }
        
        console.log('언어 감지 결과:', {
            inputTexts: inputTexts.length,
            englishCount: englishCount,
            koreanCount: koreanCount,
            detectedLanguage: detectedLanguage
        });
    }
    
    const targetLabels = {
        senior: detectedLanguage === 'en' ? 'Senior (50+)' : '시니어 (50대 이상)',
        worker: detectedLanguage === 'en' ? 'Office workers (20-30s)' : '2030 직장인',
        housewife: detectedLanguage === 'en' ? 'Housewife' : '주부',
        all: detectedLanguage === 'en' ? 'All' : '전체'
    };
    
    const genderLabels = {
        male: detectedLanguage === 'en' ? 'Male' : '남성',
        female: detectedLanguage === 'en' ? 'Female' : '여성',
        both: detectedLanguage === 'en' ? 'Both' : '남녀 모두'
    };
    
    // Determine prompt language based on input
    const promptLanguage = detectedLanguage === 'en' ? 'en' : 'ko';
    const languageInstruction = detectedLanguage === 'en' 
        ? '6. Write in English (match the input language)' 
        : '6. Write in Korean';
    
    const promptTitle = detectedLanguage === 'en'
        ? 'Generate YouTube thumbnail phrases.'
        : 'Generate YouTube thumbnail phrases.';
    
    const basicInfoLabel = detectedLanguage === 'en' ? '**Basic Information:**' : '**Basic Information:**';
    const coreMessageLabel = detectedLanguage === 'en' ? '**Core Message:**' : '**Core Message:**';
    const requirementsLabel = detectedLanguage === 'en' ? '**Requirements:**' : '**Requirements:**';
    const generationRulesLabel = detectedLanguage === 'en' ? '**Generation Rules:**' : '**Generation Rules:**';
    const outputFormatLabel = detectedLanguage === 'en' ? '**Output Format:**' : '**Output Format:**';
    const threeLineRulesLabel = detectedLanguage === 'en' ? '**3-Line Structure Rules:**' : '**3-Line Structure Rules:**';
    
    const videoTopicLabel = detectedLanguage === 'en' ? '- Video Topic:' : '- Video Topic:';
    const targetAudienceLabel = detectedLanguage === 'en' ? '- Target Audience:' : '- Target Audience:';
    const genderLabel = detectedLanguage === 'en' ? '- Gender:' : '- Gender:';
    const shockPointLabel = detectedLanguage === 'en' ? '- Impact Point:' : '- Impact Point:';
    const synopsisLabel = detectedLanguage === 'en' ? '- Video Synopsis:' : '- Video Synopsis:';
    const phraseCountLabel = detectedLanguage === 'en' ? '- Number of phrases to generate:' : '- Number of phrases to generate:';
    const maxLengthLabel = detectedLanguage === 'en' ? '- Maximum length:' : '- Maximum length:';
    const shockCheckLabel = detectedLanguage === 'en' ? '- Target impact point:' : '- Target impact point:';
    
    const phraseCountText = detectedLanguage === 'en' 
        ? `${data.phraseCount} phrases`
        : `${data.phraseCount} phrases`;
    const maxLengthText = detectedLanguage === 'en'
        ? `${data.maxLength} characters`
        : `${data.maxLength} characters`;
    const shockCheckText = detectedLanguage === 'en'
        ? (data.shockCheck ? 'Yes' : 'No')
        : (data.shockCheck ? 'Yes' : 'No');
    
    const exampleLabel = detectedLanguage === 'en' ? 'Examples:' : 'Examples:';
    
    let prompt = `${promptTitle}

${basicInfoLabel}
${videoTopicLabel} ${data.videoTopic}
${targetAudienceLabel} ${targetLabels[data.targetAudience]}
${genderLabel} ${genderLabels[data.gender]}

${coreMessageLabel}
${shockPointLabel} ${data.shockPoint}
${synopsisLabel} ${data.synopsis}

${requirementsLabel}
${phraseCountLabel} ${phraseCountText}
${maxLengthLabel} ${maxLengthText}
${shockCheckLabel} ${shockCheckText}

${generationRulesLabel}
1. ${detectedLanguage === 'en' ? 'Write engaging phrases that encourage clicks' : 'Write engaging phrases that encourage clicks'}
2. ${detectedLanguage === 'en' ? 'Use numbers and statistics for impact (e.g., 20x, 300%, in 3 minutes)' : 'Use numbers and statistics for impact (e.g., 20x, 300%, in 3 minutes)'}
3. ${detectedLanguage === 'en' ? 'Use expressions that stimulate curiosity' : 'Use expressions that stimulate curiosity'}
4. ${detectedLanguage === 'en' ? 'Use language and tone appropriate for the target audience' : 'Use language and tone appropriate for the target audience'}
5. ${detectedLanguage === 'en' ? 'Each phrase should be independent and attractive' : 'Each phrase should be independent and attractive'}
${languageInstruction}
7. **${detectedLanguage === 'en' ? 'Phrase length: 20-35 characters (excluding spaces) - optimized for thumbnails' : 'Phrase length: 20-35 characters (excluding spaces) - optimized for thumbnails'}**
${detectedLanguage === 'en' ? '**CRITICAL: You MUST write all phrases in English. Match the input language exactly.**' : ''}
8. ${detectedLanguage === 'en' ? 'Each phrase should be written from a completely different angle and approach' : 'Each phrase should be written from a completely different angle and approach'}
9. ${detectedLanguage === 'en' ? 'Actively use numbers, statistics, time, ratios, etc.' : 'Actively use numbers, statistics, time, ratios, etc.'}
10. ${detectedLanguage === 'en' ? 'Stimulate curiosity with "?", "!", "..." etc.' : 'Stimulate curiosity with "?", "!", "..." etc.'}
11. ${detectedLanguage === 'en' ? 'Use concise and impactful expressions' : 'Use concise and impactful expressions'}

${outputFormatLabel}
${detectedLanguage === 'en' 
    ? `Generate ${data.phraseCount} completely independent thumbnail phrases in ENGLISH.\nEach phrase should be written in 3 lines, and put a blank line between phrases.\n**IMPORTANT: Never use numbers (1., 2., 3., etc.) or symbols (-, •, etc.).**\nEach phrase should consist of pure text in 3 lines.\nWrite only pure phrases in English.\n**CRITICAL: All phrases MUST be in English language.**`
    : `Generate ${data.phraseCount} completely independent thumbnail phrases.\nEach phrase should be written in 3 lines, and put a blank line between phrases.\n**IMPORTANT: Never use numbers (1., 2., 3., etc.) or symbols (-, •, etc.).**\nEach phrase should consist of pure text in 3 lines.\nWrite only pure phrases.`}

${threeLineRulesLabel}
- ${detectedLanguage === 'en' ? 'Line 1: Title/Core Message (large font)' : 'Line 1: Title/Core Message (large font)'}
- ${detectedLanguage === 'en' ? 'Line 2: Emphasized phrase/Result (medium font, color emphasis)' : 'Line 2: Emphasized phrase/Result (medium font, color emphasis)'}
- ${detectedLanguage === 'en' ? 'Line 3: Subtitle/Method (small font)' : 'Line 3: Subtitle/Method (small font)'}

${exampleLabel}
${detectedLanguage === 'en' ? 
`At 70, I turned on a smartphone for the first time
I couldn't even read the letters, but now I'm a YouTuber!
A 70-year-old grandmother's first video call story

One comment changed my life
I cried at a message from a stranger
The second spring that came after retirement

One finger connected me to the world again
The moment 'learning' overcame age
The miraculous change brought by smartphones

Reunited with a friend after 30 years
Through just one KakaoTalk emoji
A story of friendship connected by digital

"What use is the internet for someone like me?"
What changed that was a single photo
The day I embraced lost memories again

The world changed, but
When I changed, the world smiled again
After retirement, learning 'new connection skills' for the first time` :

`스마트폰이 이렇게 따뜻할 줄
손주 얼굴 한 번 보려다 인생이 달라졌습니다
70세 할머니의 첫 영상통화 이야기

댓글 하나가 내 인생을 바꿨습니다
낯선 이름의 메시지에 울었습니다
은퇴 후 찾아온 두 번째 봄

손가락 하나로 세상과 다시 연결되다
'배움'이 나이를 이긴 순간
스마트폰이 가져온 기적 같은 변화

30년 끊긴 친구를
카톡 이모티콘 하나로 다시 만났습니다
디지털이 이어준 우정의 이야기

"나 같은 노인에게 인터넷이 무슨 소용이야?"
그 말을 바꾼 건 단 한 장의 사진이었습니다
잃어버린 추억을 다시 품은 날

세상은 변했지만
내가 변하니 세상이 다시 웃어줬다
은퇴 후, 처음 배우는 '새로운 연결의 기술'`}
`;

    return prompt;
}

// Call Claude API (using server-side proxy)
async function callClaudeAPI(prompt) {
    // Check session token (optional - free users don't need token)
    if (!sessionToken) {
        sessionToken = sessionStorage.getItem('sessionToken') || '';
    }
    
    try {
        // Call API with or without token (free users can call without token)
        const response = await fetch('/api/generate-phrases', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                prompt: prompt,
                token: sessionToken || null
            })
        });
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: 'Unable to parse server response.' };
            }
            
            if (response.status === 401) {
                // Session expired - delete token
                sessionStorage.removeItem('sessionToken');
                sessionToken = '';
                throw new Error('INVALID_SESSION');
            } else if (response.status === 429) {
                // Handle usage exceeded - check error code
                if (errorData.code === 'FREE_USAGE_EXCEEDED') {
                    // Free usage exhausted - show password modal
                    showPasswordModalForFreeLimit();
                    throw new Error('FREE_USAGE_EXCEEDED');
                } else if (errorData.code === 'PREMIUM_USAGE_EXCEEDED') {
                    // Premium usage exhausted - show contact message
                    showPremiumLimitMessage();
                    throw new Error('PREMIUM_USAGE_EXCEEDED');
                } else {
                    // Generic usage exceeded
                    const usageMsg = errorData.error || 'Daily usage limit exceeded. Please try again tomorrow.';
                    alert(usageMsg);
                    throw new Error('USAGE_EXCEEDED');
                }
            }
            
            const errorMessage = errorData.error || errorData.details || 'Server request failed: ' + response.status;
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Validate response data
        if (!data.phrases) {
            throw new Error('Failed to receive phrase data from server. Response: ' + JSON.stringify(data));
        }
        
        // Check if phrases is an array
        if (!Array.isArray(data.phrases)) {
            throw new Error('Invalid server response format. phrases is not an array.');
        }
        
        // Error if phrases is empty
        if (data.phrases.length === 0) {
            throw new Error('Server returned empty phrase array.');
        }
        
        // Update usage info from server response
        if (data.usage) {
            usageInfo = {
                current: data.usage.current || 0,
                limit: data.usage.limit || (data.usage.type === 'premium' ? 100 : 3),
                remaining: data.usage.remaining || 0,
                exceeded: data.usage.exceeded || false,
                type: data.usage.type || 'free'
            };
            updateUsageDisplay();
        }
        
        return data.phrases;
        
    } catch (error) {
        console.error('Server API call failed:', error);
        console.error('Error type:', typeof error);
        console.error('Error message:', error.message);
        
        // Pass through INVALID_SESSION, INVALID_PASSWORD, or USAGE_EXCEEDED (handled separately in upper handler)
        if (error && (error.message === 'INVALID_SESSION' || error.message === 'INVALID_PASSWORD' || error.message === 'USAGE_EXCEEDED')) {
            throw error;
        }
        
        // Throw other errors with message
        const errorMessage = (error && error.message) ? error.message : String(error);
        throw new Error('Server communication failed: ' + errorMessage);
    }
}

// Direct Claude API call (for development/testing)
// Note: Do not use this function on the client side. process.env does not work in browsers.
async function callClaudeAPIDirect(prompt) {
    // This method cannot be used on the client side
    // Must use server-side proxy
    throw new Error('Cannot call API directly from client side. Please use server-side proxy.');
}

// New sample phrases (senior digital adaptation theme)
function generateSamplePhrases() {
    const samplePhrases = [
        "스마트폰이 이렇게 따뜻할 줄\n손주 얼굴 한 번 보려다 인생이 달라졌습니다\n70세 할머니의 첫 영상통화 이야기",
        "댓글 하나가 내 인생을 바꿨습니다\n낯선 이름의 메시지에 울었습니다\n은퇴 후 찾아온 두 번째 봄",
        "손가락 하나로 세상과 다시 연결되다\n'배움'이 나이를 이긴 순간\n스마트폰이 가져온 기적 같은 변화",
        "30년 끊긴 친구를\n카톡 이모티콘 하나로 다시 만났습니다\n디지털이 이어준 우정의 이야기",
        "'나 같은 노인에게 인터넷이 무슨 소용이야?'\n그 말을 바꾼 건 단 한 장의 사진이었습니다\n잃어버린 추억을 다시 품은 날",
        "세상은 변했지만\n내가 변하니 세상이 다시 웃어줬다\n은퇴 후, 처음 배우는 '새로운 연결의 기술'"
    ];

    return samplePhrases;
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayPhrases(phrases) {
    const container = document.getElementById('phrasesContainer');
    container.innerHTML = '';
    
    phrases.forEach((phrase, index) => {
        const phraseEl = document.createElement('div');
        phraseEl.className = 'phrase-item';
        
        // Check phrase length
        const lengthInfo = checkPhraseLength(phrase);
        
        const hasWarning = index === 0 || index === 2; // Add warning to some phrases
        
        // Parse into 3 lines and apply color highlighting
        const phraseLines = parsePhraseToLines(phrase);
        
        // Use translation function (if t function exists)
        const phraseLabel = (typeof t === 'function') ? t('phraseLabel') : 'Phrase';
        const editPlaceholder = (typeof t === 'function') ? t('editPlaceholder') : 'Enter phrase';
        const editText = (typeof t === 'function') ? t('edit') : 'Edit';
        const saveText = (typeof t === 'function') ? t('save') : 'Save';
        const cancelText = (typeof t === 'function') ? t('cancel') : 'Cancel';
        const warningText = (typeof t === 'function') ? t('warning') : 'Questionable Warning';
        const charsText = (typeof t === 'function') ? t('characters') : 'chars';
        
        // Escape HTML attribute values
        const escapedPlaceholder = escapeHtml(editPlaceholder);
        const escapedWarningText = escapeHtml(warningText);
        
        // 템플릿 리터럴을 문자열 연결로 변경하여 린터 에러 방지
        const phraseIndex = index + 1;
        const lengthInfoClass = lengthInfo.isOptimal ? 'optimal' : 'warning';
        const warningLabel = hasWarning ? '<span class="warning-label">' + escapedWarningText + '</span>' : '';
        const phraseLinesHtml = phraseLines.map(function(line, lineIndex) {
            return '<span class="phrase-line line' + (lineIndex + 1) + '">' + highlightKeywords(line) + '</span>';
        }).join('');
        const editInputsHtml = phraseLines.map(function(line, lineIndex) {
            return '<input type="text" class="edit-input" data-line="' + lineIndex + '" value="' + escapeHtml(line) + '" placeholder="' + escapedPlaceholder + '">';
        }).join('');
        
        phraseEl.innerHTML = 
            '<div class="phrase-header">' +
                '<h3 class="phrase-title">' + escapeHtml(phraseLabel) + ' ' + phraseIndex + '</h3>' +
                '<div class="phrase-meta">' +
                    '<span class="length-info ' + lengthInfoClass + '">' + lengthInfo.length + escapeHtml(charsText) + '</span>' +
                    warningLabel +
                '</div>' +
            '</div>' +
            '<div class="phrase-text">' +
                phraseLinesHtml +
            '</div>' +
            '<div class="phrase-actions">' +
                '<button class="edit-btn" data-phrase-index="' + index + '">' + escapeHtml(editText) + '</button>' +
            '</div>' +
            '<div class="edit-panel" style="display: none;">' +
                '<div class="edit-inputs">' +
                    editInputsHtml +
                '</div>' +
                '<div class="edit-buttons">' +
                    '<button class="save-btn" data-phrase-index="' + index + '">' + escapeHtml(saveText) + '</button>' +
                    '<button class="cancel-btn" data-phrase-index="' + index + '">' + escapeHtml(cancelText) + '</button>' +
                '</div>' +
            '</div>';
        
        // Add event listeners for edit functionality
        const editBtn = phraseEl.querySelector('.edit-btn');
        const saveBtn = phraseEl.querySelector('.save-btn');
        const cancelBtn = phraseEl.querySelector('.cancel-btn');
        const editPanel = phraseEl.querySelector('.edit-panel');
        const phraseText = phraseEl.querySelector('.phrase-text');
        const editInputs = phraseEl.querySelectorAll('.edit-input');
        
        // Edit button click
        editBtn.addEventListener('click', function() {
            editPanel.style.display = 'block';
            phraseText.style.display = 'none';
            editBtn.style.display = 'none';
        });
        
        // Save button click
        saveBtn.addEventListener('click', function() {
            const newLines = Array.from(editInputs).map(input => input.value.trim());
            const newPhrase = newLines.join('\n');
            
            // Check phrase length
            const newLengthInfo = checkPhraseLength(newPhrase);
            
            // Update phrase
            const newPhraseLines = parsePhraseToLines(newPhrase);
            phraseText.innerHTML = newPhraseLines.map(function(line, lineIndex) {
                return '<span class="phrase-line line' + (lineIndex + 1) + '">' + highlightKeywords(line) + '</span>';
            }).join('');
            
            // Update length info
            const lengthInfoEl = phraseEl.querySelector('.length-info');
            const charsText = (typeof t === 'function') ? t('characters') : 'chars';
            const escapedCharsText = escapeHtml(charsText);
            lengthInfoEl.textContent = newLengthInfo.length + escapedCharsText;
            lengthInfoEl.className = 'length-info ' + (newLengthInfo.isOptimal ? 'optimal' : 'warning');
            
            // Hide edit panel
            editPanel.style.display = 'none';
            phraseText.style.display = 'block';
            editBtn.style.display = 'block';
        });
        
        // Cancel button click
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
        const copiedText = (typeof t === 'function') ? t('copied') : 'Copied!';
        btn.textContent = copiedText;
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#6c757d';
        }, 1500);
    }).catch(err => {
        console.error('Copy failed:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = cleanPhrase;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const btn = event.target;
            const originalText = btn.textContent;
            const copiedText = (typeof t === 'function') ? t('copied') : 'Copied!';
            btn.textContent = copiedText;
            btn.style.background = '#28a745';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#6c757d';
            }, 1500);
        } catch (fallbackErr) {
            const copyErrorMsg = (typeof t === 'function') ? t('copyError') : 'Copy failed. Please select the text manually.';
            alert(copyErrorMsg);
        }
        document.body.removeChild(textArea);
    });
}

// Form validation
function validateStep1() {
    const videoTopic = document.getElementById('videoTopic').value.trim();
    if (!videoTopic) {
        const errorMsg = (typeof t === 'function') ? t('videoTopicRequired') : 'Please enter the video topic.\nExample: How many true friends do we have after 50?';
        alert(errorMsg);
        return false;
    }
    return true;
}

function validateStep2() {
    const shockPoint = document.getElementById('shockPoint').value.trim();
    if (!shockPoint) {
        const errorMsg = (typeof t === 'function') ? t('shockPointRequired') : 'Please enter the impact point.';
        alert(errorMsg);
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
    document.getElementById('step' + step).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        stepEl.classList.toggle('active', index + 1 === step);
    });
    
    currentStep = step;
}

// Simple step navigation without validation for "Next" button
function goToNextStep() {
    if (currentStep === 1) {
        goToStep(2);
    } else if (currentStep === 2) {
        generatePhrases();
    }
}


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

// Line break and phrase utility (senior digital adaptation version)
function smartLineBreak(text) {
    const breakPatterns = [
        /([가을를])\s+/g,
        /([에에서로])\s+/g,
        /([는은])\s+/g,
        /([도만])\s+/g,
        /([하고하면서])\s+/g,
        /([때문에위해])\s+/g,
        /([라고라고서])\s+/g,
        /([하면하면서])\s+/g,
        /(스마트폰)\s+/g,
        /(영상통화)\s+/g,
        /(댓글)\s+/g,
        /(이모티콘)\s+/g,
        /(손주)\s+/g,
        /(사진)\s+/g,
        /(추억)\s+/g,
        /(연결)\s+/g,
        /(배움)\s+/g,
        /(\d+[%배도])\s+/g,
        /(\d+분)\s+/g,
        /(\d+년)\s+/g,
        /(\d+잔)\s+/g,
        /(\d+명)\s+/g
    ];

    let result = text;

    breakPatterns.forEach(function(pattern) {
        result = result.replace(pattern, '$1\n');
    });

    let lines = result.split('\n').filter(function(line) {
        return line.trim().length > 0;
    });

    if (lines.length === 1) {
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

function checkPhraseLength(phrase) {
    const cleanPhrase = phrase.replace(/\n/g, '').replace(/\s+/g, '');
    const length = cleanPhrase.length;

    console.log('Phrase: "' + phrase + '"');
    console.log('Length: ' + length + ' chars (excluding spaces)');

    return { phrase: phrase, length: length, isOptimal: length >= 20 && length <= 35 };
}

function highlightKeywords(text) {
    const patterns = [
        { pattern: /(\d+[%배]?|10년|3분|첫|다시|오늘|처음|둘째|세째|한 번|단 한 번)/g, class: 'highlight-orange' },
        { pattern: /(울었습니다|변했습니다|달라졌습니다|용기|두려움|외로움)/g, class: 'highlight-red' },
        { pattern: /(방법|확인|배움|연결|영상통화|댓글|이모티콘|사진|추억|친구|손주|스마트폰)/g, class: 'highlight-blue' }
    ];

    let highlightedText = text;

    patterns.forEach(function(item) {
        const pattern = item.pattern;
        const className = item.class;
        highlightedText = highlightedText.replace(pattern, '<span class="' + className + '">$1</span>');
    });

    return highlightedText;
}

// Add phrase templates based on target audience
function getPhraseTemplates(target) {
    const templates = {
        senior: [
            "시니어를 위한 인생 2막 건강 습관",
            "50대 이후 꼭 알아야 할 행복한 노년 비결",
            "나이 들어도 젊게 사는 방법, 지금 시작하세요",
            "은퇴 후 건강과 행복을 지키는 현실 꿀팁"
        ],
        worker: [
            "직장인 필수 건강 루틴 5가지",
            "퇴근 후 피로를 풀어주는 스트레스 해소법",
            "바쁜 직장인을 위한 현실적인 자기관리 팁",
            "매일의 업무 효율을 높이는 작은 습관"
        ],
        housewife: [
            "주부를 위한 하루 10분 건강 루틴",
            "가정과 나를 지키는 균형의 기술",
            "살림과 건강, 두 마리 토끼를 잡는 방법",
            "행복한 집을 만드는 주부 건강 비결"
        ],
        all: [
            "모든 세대를 위한 건강하고 행복한 삶의 비결",
            "일상 속 작은 변화가 만드는 건강한 인생",
            "누구나 따라할 수 있는 생활 건강 습관",
            "행복한 하루를 위한 필수 웰빙 정보"
        ]
    };
    
    return templates[target] || templates.all;
}
