/* Global State Variables */
let tokenArray = [];
let currentStepIndex = 0;
let speechSynth = window.speechSynthesis;
let currentUtterance = null;
let isSpeaking = false;
let voiceSpeed = 0.85; // Slightly slower for clear pronunciation

// Start initialization
window.onload = function() {
    initTheme();
    detectTokenPatterns();

    // Keyboard navigation listener
    document.addEventListener('keydown', handleKeyPress);
}

// Initialize Theme Mode on Startup
function initTheme() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').innerText = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('themeIcon').innerText = '🌙';
    }
}

// Trigger vibration helper
function triggerHaptic(duration = 60) {
    if (navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

// Interactive Toast Alert
function showNotification(msg, type = 'info') {
    const toast = document.getElementById('statusToast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMsg = document.getElementById('toastMessage');

    toast.classList.remove('hidden', 'bg-emerald-100', 'text-emerald-800', 'bg-rose-100', 'text-rose-800', 'bg-blue-100', 'text-blue-800', 'dark:bg-emerald-950/40', 'dark:text-emerald-300', 'dark:bg-rose-950/40', 'dark:text-rose-300', 'dark:bg-blue-950/40', 'dark:text-blue-300');
    
    if (type === 'error') {
        toast.classList.add('bg-rose-100', 'text-rose-800', 'dark:bg-rose-950/40', 'dark:text-rose-300');
        toastIcon.innerText = '❌';
    } else if (type === 'success') {
        toast.classList.add('bg-emerald-100', 'text-emerald-800', 'dark:bg-emerald-950/40', 'dark:text-emerald-300');
        toastIcon.innerText = '✅';
    } else {
        toast.classList.add('bg-blue-100', 'text-blue-800', 'dark:bg-blue-950/40', 'dark:text-blue-300');
        toastIcon.innerText = 'ℹ️';
    }

    toastMsg.innerText = msg;
    toast.classList.remove('hidden');
    
    // Auto hide toast after 6 seconds
    setTimeout(() => {
        hideToast();
    }, 6000);
}

function hideToast() {
    document.getElementById('statusToast').classList.add('hidden');
}

// Advanced segment-based extraction logic
// This splits by commas/newlines, extracts digits from each segment, and verifies token lengths
function extractTokens(rawString, splitLimit) {
    if (!rawString) return [];
    
    // Split raw text by commas, semicolons, or newlines first
    const segments = rawString.split(/[\n,;]+/);
    let result = [];
    
    segments.forEach(seg => {
        // Extract only digits from this specific segment
        const cleaned = seg.replace(/\D/g, '');
        
        // Only process segments that have at least splitLimit digits
        // This automatically skips shorter unrelated strings, like 11-digit Meter Nos, costs, vending amounts, etc.
        if (cleaned.length >= splitLimit) {
            // Extract splitLimit blocks (e.g. 20 digits chunks)
            for (let i = 0; i <= cleaned.length - splitLimit; i += splitLimit) {
                const block = cleaned.slice(i, i + splitLimit);
                if (block.length === splitLimit) {
                    result.push(block);
                }
            }
        }
    });
    return result;
}

// Auto Extraction Logic
function detectTokenPatterns() {
    const rawString = document.getElementById('rawToken').value;
    const splitLimit = getSplitLimit();
    
    const matches = extractTokens(rawString, splitLimit);
    
    if (matches.length === 0) {
        document.getElementById('detectedCountBadge').innerText = "0 Blocks Found";
        return;
    }

    document.getElementById('detectedCountBadge').innerText = `${matches.length} Block(s) (${splitLimit} Digits)`;
}

// Monitor input dynamically
document.getElementById('rawToken').addEventListener('input', detectTokenPatterns);

function getSplitLimit() {
    const splitSelect = document.getElementById('splitCount').value;
    if (splitSelect === 'custom') {
        return parseInt(document.getElementById('customWidth').value, 10) || 4;
    }
    return parseInt(splitSelect, 10);
}

// Toggle custom digit block visibility
document.getElementById('splitCount').addEventListener('change', function() {
    const customBlock = document.getElementById('customDigitBlock');
    if (this.value === 'custom') {
        customBlock.style.display = 'block';
    } else {
        customBlock.style.display = 'none';
    }
});

function pasteFromClipboard() {
    triggerHaptic(30);
    if (navigator.clipboard) {
        navigator.clipboard.readText().then(text => {
            document.getElementById('rawToken').value = text;
            detectTokenPatterns();
            showNotification("Text pasted successfully!", "success");
        }).catch(err => {
            showNotification("Please paste directly into the box using your keyboard or touch hold.", "info");
        });
    } else {
        showNotification("Clipboard API unavailable. Please paste manually.", "info");
    }
}

function clearInput() {
    triggerHaptic(30);
    document.getElementById('rawToken').value = '';
    detectTokenPatterns();
    showNotification("Token entry box cleared", "info");
}

function loadDemoToken() {
    triggerHaptic(50);
    // Simulated standard real-life STS multi-stage 220-digit recharge token message
    const demoToken = "Successful!Your BPDBprepaid Prepaid Token is 4677-0452-9798-2507-0677,1122-3344-5566-7788-9900,5544-3322-1100-9988-7766,8877-6655-4433-2211-0099,1234-5678-9012-3456-7890,9876-5432-1098-7654-3210,1111-2222-3333-4444-5555,6666-7777-8888-9999-0000,1212-3434-5656-7878-9090,0909-8787-6565-4343-2121,9999-8888-7777-6666-5555,SquNo:N/A for offline Meter No:12100880447,Vending Amt:1000.0,Enrg Cost: 957.12,Total Charge:N/A.";
    document.getElementById('rawToken').value = demoToken;
    document.getElementById('splitCount').value = "20";
    document.getElementById('customDigitBlock').style.display = 'none';
    detectTokenPatterns();
    showNotification("Demo Multi-token sequence loaded. Ready to run!", "success");
}

// Run Assist
function startHelper() {
    triggerHaptic(100);
    const rawTokenData = document.getElementById('rawToken').value;
    const splitLimit = getSplitLimit();

    // Extract numeric blocks utilizing segment-first separation (commas/newlines)
    tokenArray = extractTokens(rawTokenData, splitLimit);

    if (tokenArray.length === 0) {
        showNotification("No valid tokens detected. Paste standard 20-digit blocks to begin.", "error");
        return;
    }

    currentStepIndex = 0;
    
    // Swap Views
    document.getElementById('viewInput').classList.add('hidden');
    document.getElementById('viewActive').classList.remove('hidden');
    document.getElementById('navFooter').classList.remove('hidden');

    renderCheckpoints();
    renderActiveChunk();
    showNotification(`Recharge workflow initiated with ${tokenArray.length} blocks.`, "success");
}

// Speak active numbers with active visual highlights block tracker
function speechCurrent() {
    triggerHaptic(60);
    if (isSpeaking) {
        speechSynth.cancel();
        setVoiceIconAndState(false);
        return;
    }

    const activeChunkStr = tokenArray[currentStepIndex];
    if (!activeChunkStr) return;

    // Segment code into blocks of 4 for human rhythm reading pace
    const formattedSpeechArr = activeChunkStr.match(/.{1,4}/g) || [];
    let speechParts = [];
    
    speechParts.push(`Block ${currentStepIndex + 1}.`);

    formattedSpeechArr.forEach((part, index) => {
        const splitDigits = part.split('').join(' ');
        speechParts.push(`Set ${index + 1}: ${splitDigits}.`);
    });

    speechParts.push("Input digits and hit enter.");
    const completeSpeechString = speechParts.join(' ');

    currentUtterance = new SpeechSynthesisUtterance(completeSpeechString);
    currentUtterance.rate = voiceSpeed;
    
    currentUtterance.onstart = () => {
        setVoiceIconAndState(true);
    };

    currentUtterance.onend = () => {
        setVoiceIconAndState(false);
    };

    currentUtterance.onerror = () => {
        setVoiceIconAndState(false);
    };

    speechSynth.speak(currentUtterance);
}

function setVoiceIconAndState(speaking) {
    isSpeaking = speaking;
    const voiceIcon = document.getElementById('voiceIcon');
    const voiceBtnText = document.getElementById('voiceBtnText');
    const btnVoice = document.getElementById('btnVoice');

    if (speaking) {
        voiceIcon.innerText = '⏹️';
        voiceBtnText.innerText = 'Stop Audio';
        btnVoice.classList.replace('bg-rose-50', 'bg-slate-800');
        btnVoice.classList.replace('text-rose-600', 'text-rose-400');
    } else {
        voiceIcon.innerText = '🔊';
        voiceBtnText.innerText = 'Listen';
        btnVoice.classList.replace('bg-slate-800', 'bg-rose-50');
        btnVoice.classList.replace('text-rose-400', 'text-rose-600');
    }
}

// Render visual UI segment components
function renderActiveChunk() {
    if (isSpeaking) {
        speechSynth.cancel();
        setVoiceIconAndState(false);
    }

    const activeChunk = tokenArray[currentStepIndex];
    if (!activeChunk) return;

    const groupsOfFour = activeChunk.match(/.{1,4}/g) || [];
    
    // Set dynamic highlighted card output text
    const outputElement = document.getElementById('formattedOutput');
    outputElement.innerHTML = '';
    
    groupsOfFour.forEach((fourDigits, index) => {
        const groupSpan = document.createElement('span');
        groupSpan.className = "inline-block px-1.5 font-mono font-black select-all transition-all duration-200 hover:text-rose-600";
        groupSpan.innerText = fourDigits;
        outputElement.appendChild(groupSpan);

        if (index < groupsOfFour.length - 1) {
            const dividerSpan = document.createElement('span');
            dividerSpan.className = "text-rose-400/40 dark:text-rose-600/50 px-1 select-none font-sans font-normal text-2xl sm:text-3xl align-middle";
            dividerSpan.innerText = "•";
            outputElement.appendChild(dividerSpan);
        }
    });

    // Sync dynamic state step text
    document.getElementById('activeStepText').innerText = `Block ${currentStepIndex + 1} of ${tokenArray.length}`;

    // Handle navigation controllers enabling parameters
    document.getElementById('btnPrev').disabled = (currentStepIndex === 0);
    if (currentStepIndex === 0) {
        document.getElementById('btnPrev').classList.add('opacity-40');
    } else {
        document.getElementById('btnPrev').classList.remove('opacity-40');
    }

    const nextBtnText = document.getElementById('nextBtnText');
    if (currentStepIndex === tokenArray.length - 1) {
        nextBtnText.innerText = "Finish ⚡";
        document.getElementById('btnNext').classList.replace('from-emerald-600', 'from-amber-600');
        document.getElementById('btnNext').classList.replace('to-teal-600', 'to-rose-600');
    } else {
        nextBtnText.innerText = "Next Block ▶";
        document.getElementById('btnNext').classList.replace('from-amber-600', 'from-emerald-600');
        document.getElementById('btnNext').classList.replace('to-rose-600', 'to-teal-600');
    }

    // Keep vertical workflow alignment and sync checklist highlights
    updateCheckpointUI();
}

// Render visually active checklist track nodes
function renderCheckpoints() {
    const container = document.getElementById('checkpointList');
    container.innerHTML = '';

    tokenArray.forEach((chunk, index) => {
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
            index === currentStepIndex 
            ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20' 
            : 'border-slate-100 dark:border-slate-800/80'
        }`;
        item.id = `checkpoint-item-${index}`;
        item.onclick = () => jumpToChunk(index);

        const prefix = chunk.slice(0, 4);
        const suffix = chunk.length > 4 ? `...${chunk.slice(-4)}` : '';

        item.innerHTML = `
            <div class="flex items-center gap-2">
                <span id="check-icon-${index}" class="text-sm font-bold">🔘</span>
                <span class="text-xs font-extrabold text-slate-500 dark:text-slate-400">Block ${index + 1}</span>
            </div>
            <span class="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">${prefix}${suffix}</span>
        `;
        container.appendChild(item);
    });
}

function updateCheckpointUI() {
    tokenArray.forEach((_, index) => {
        const item = document.getElementById(`checkpoint-item-${index}`);
        const icon = document.getElementById(`check-icon-${index}`);
        if (!item) return;

        item.className = "flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer";

        if (index < currentStepIndex) {
            item.classList.add('border-emerald-200', 'bg-emerald-50/20', 'dark:border-emerald-950/40', 'dark:bg-emerald-950/10');
            icon.innerText = '✅';
        } else if (index === currentStepIndex) {
            item.classList.add('border-rose-500', 'bg-rose-50/50', 'dark:bg-rose-950/30', 'ring-1', 'ring-rose-500/20');
            icon.innerText = '⚡';
            // Auto-scroll list to bring active block into focus view
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.add('border-slate-100', 'dark:border-slate-800/80', 'opacity-50');
            icon.innerText = '🔘';
        }
    });
}

function jumpToChunk(index) {
    triggerHaptic(50);
    currentStepIndex = index;
    renderActiveChunk();
}

function navigateChunk(direction) {
    triggerHaptic(80);
    
    if (direction === 1) {
        if (currentStepIndex === tokenArray.length - 1) {
            showNotification("Token sequence completed! Meter status should show online.", "success");
            resetToInput();
            return;
        }
        currentStepIndex++;
    } else {
        if (currentStepIndex > 0) {
            currentStepIndex--;
        }
    }
    renderActiveChunk();
}

// Copy chunk with fallback execution logic
function copyCurrentChunk() {
    triggerHaptic(40);
    const currentChunkStr = tokenArray[currentStepIndex];
    
    const dummyInput = document.createElement("input");
    document.body.appendChild(dummyInput);
    dummyInput.value = currentChunkStr;
    dummyInput.select();
    
    try {
        document.execCommand("copy");
        const btnText = document.getElementById('copyBtnText');
        btnText.innerText = "Copied! 👍";
        showNotification(`Block ${currentStepIndex + 1} copied to clipboard!`, "success");
        setTimeout(() => {
            btnText.innerText = "Copy Code";
        }, 2000);
    } catch (err) {
        showNotification("Could not auto copy. Highlight digits manually.", "error");
    }
    document.body.removeChild(dummyInput);
}

function resetToInput() {
    triggerHaptic(100);
    if (isSpeaking) {
        speechSynth.cancel();
    }
    
    document.getElementById('viewActive').classList.add('hidden');
    document.getElementById('navFooter').classList.add('hidden');
    document.getElementById('viewInput').classList.remove('hidden');
}

// Global Keyboard Shortcut Controller
function handleKeyPress(e) {
    // Only capture shortcuts when active viewer view is displayed
    if (document.getElementById('viewActive').classList.contains('hidden')) return;

    if (e.code === 'ArrowRight') {
        navigateChunk(1);
    } else if (e.code === 'ArrowLeft') {
        navigateChunk(-1);
    } else if (e.code === 'Space') {
        e.preventDefault(); // Stop window scroll jumps
        speechCurrent();
    } else if (e.code === 'KeyC') {
        copyCurrentChunk();
    }
}

// Theme Toggle Controller
function toggleTheme() {
    triggerHaptic(50);
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');

    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.theme = 'light';
        themeIcon.innerText = '🌙';
    } else {
        html.classList.add('dark');
        localStorage.theme = 'dark';
        themeIcon.innerText = '☀️';
    }
}
