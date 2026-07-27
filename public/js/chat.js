const socket = io({ reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 50, transports: ['websocket', 'polling'] });

// Lang init for chat
document.documentElement.dir = LANG_DATA[Lang.getCurrent()]?.dir || 'rtl';
document.documentElement.lang = Lang.getCurrent();
Lang.apply();
Lang.createLangSelector(document.getElementById('langContainerChat'));

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const filterOverlay = document.getElementById('filterOverlay');
const remoteIdle = document.getElementById('remoteIdle');
const remoteFlag = document.getElementById('remoteFlag');
const idleText = document.getElementById('idleText');
const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');
const msgBox = document.getElementById('msgBox');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const skipBtn = document.getElementById('skipBtn');
const stopBtn = document.getElementById('stopBtn');
const muteBtn = document.getElementById('muteBtn');
const camBtn = document.getElementById('camBtn');
const reportBtn = document.getElementById('reportBtn');
const reportModal = document.getElementById('reportModal');
const cancelReport = document.getElementById('cancelReport');
const submitReport = document.getElementById('submitReport');
const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const closeStats = document.getElementById('closeStats');
const leaderModal = document.getElementById('leaderModal');
const closeLeader = document.getElementById('closeLeader');
const pointsDisplay = document.getElementById('pointsDisplay');
const captionBar = document.getElementById('captionBar');
const contentWarning = document.getElementById('contentWarning');
const warningOk = document.getElementById('warningOk');
const filtersBar = document.getElementById('filtersBar');

const urlParams = new URLSearchParams(window.location.search);
const myGender = urlParams.get('gender') || 'male';
const myCountry = urlParams.get('country') || 'any';
const myPrefGender = urlParams.get('prefGender') || 'any';

let localStream = null;
let peerConnection = null;
let isMuted = false;
let isCamOff = false;
let isSearching = false;
let currentRoomId = null;
let currentFilter = 'none';
let filterAnimFrame = null;
let activeParticles = [];
let partnerCountry = null;

function ct(key) {
    const lang = Lang.getCurrent();
    const data = LANG_DATA[lang] || LANG_DATA['ar'];
    const keys = ('chat.' + key).split('.');
    let val = data;
    for (const k of keys) { if (val && typeof val === 'object') val = val[k]; else return key; }
    return val || key;
}

const COUNTRY_FLAGS = {
    JO: '\u{1F1EF}\u{1F1F4}', SA: '\u{1F1F8}\u{1F1E6}', AE: '\u{1F1E6}\u{1F1EA}',
    EG: '\u{1F1EA}\u{1F1EC}', IQ: '\u{1F1EE}\u{1F1F1}', KW: '\u{1F1F0}\u{1F1FC}',
    QA: '\u{1F1F6}\u{1F1E6}', BH: '\u{1F1E7}\u{1F1ED}', OM: '\u{1F1F4}\u{1F1F2}',
    LB: '\u{1F1F1}\u{1F1E7}', SY: '\u{1F1F8}\u{1F1FE}', PS: '\u{1F1F5}\u{1F1F8}',
    MA: '\u{1F1F2}\u{1F1E6}', DZ: '\u{1F1E9}\u{1F1FF}', TN: '\u{1F1F9}\u{1F1F3}',
    LY: '\u{1F1F1}\u{1F1FE}', SD: '\u{1F1F8}\u{1F1E9}', YE: '\u{1F1FE}\u{1F1EA}',
    MR: '\u{1F1F2}\u{1F1F7}', SO: '\u{1F1F8}\u{1F1F4}', DJ: '\u{1F1E9}\u{1F1EF}',
    KM: '\u{1F1F0}\u{1F1F2}', TD: '\u{1F1F9}\u{1F1E9}',
    US: '\u{1F1FA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}', FR: '\u{1F1EB}\u{1F1F7}',
    DE: '\u{1F1E9}\u{1F1EA}', IT: '\u{1F1EE}\u{1F1F9}', ES: '\u{1F1EA}\u{1F1F8}',
    JP: '\u{1F1EF}\u{1F1F5}', KR: '\u{1F1F0}\u{1F1F7}', CN: '\u{1F1E8}\u{1F1F3}',
    IN: '\u{1F1EE}\u{1F1F3}', TR: '\u{1F1F9}\u{1F1F7}', BR: '\u{1F1E7}\u{1F1F7}',
    CA: '\u{1F1E8}\u{1F1E6}', AU: '\u{1F1E6}\u{1F1FA}', RU: '\u{1F1F7}\u{1F1FA}',
    PK: '\u{1F1F5}\u{1F1F0}', BD: '\u{1F1E7}\u{1F1E9}', TH: '\u{1F1F9}\u{1F1ED}',
    VN: '\u{1F1FB}\u{1F1F3}', PH: '\u{1F1F5}\u{1F1ED}', ID: '\u{1F1EE}\u{1F1E9}',
    MY: '\u{1F1F2}\u{1F1FE}', SG: '\u{1F1F8}\u{1F1EC}'
};

function getCountryName(code) {
    return ct('messages.countries.' + code) || code;
}

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ]
};

// ===================== STATS =====================
const STATS_KEY = 'golive_stats';
function getStats() {
    const d = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    return d || { chats: 0, minutes: 0, countries: [], points: 0, startTime: null };
}
function saveStats(s) { localStorage.setItem(STATS_KEY, JSON.stringify(s)); }

function addPoints(n) {
    const s = getStats();
    s.points += n;
    saveStats(s);
    pointsDisplay.textContent = s.points;
}

function recordChatEnd(partnerCountry) {
    const s = getStats();
    s.chats++;
    if (s.startTime) {
        s.minutes += Math.round((Date.now() - s.startTime) / 60000);
    }
    if (partnerCountry && partnerCountry !== 'any' && !s.countries.includes(partnerCountry)) {
        s.countries.push(partnerCountry);
    }
    s.points += 10;
    saveStats(s);
    pointsDisplay.textContent = s.points;
    showLevelUp(s.points);
}

function getLevel(points) {
    if (points >= 500) return { name: '5 - أسطوري', color: '#f59e0b' };
    if (points >= 300) return { name: '4 - خبير', color: '#8b5cf6' };
    if (points >= 150) return { name: '3 - متوسط', color: '#3b82f6' };
    if (points >= 50) return { name: '2 - متمرس', color: '#22c55e' };
    return { name: '1 - مبتدئ', color: '#8888a0' };
}

function showLevelUp(points) {
    const lvl = getLevel(points);
    if (points === 50 || points === 150 || points === 300 || points === 500) {
        addMsg(ct('messages.levelUp') + ' ' + lvl.name, 'sys');
    }
}

function showStats() {
    const s = getStats();
    document.getElementById('statChats').textContent = s.chats;
    document.getElementById('statMinutes').textContent = s.minutes;
    document.getElementById('statCountries').textContent = s.countries.length;
    document.getElementById('statPoints').textContent = s.points;
    const lvl = getLevel(s.points);
    document.getElementById('statLevel').textContent = lvl.name;
    document.getElementById('statLevel').style.color = lvl.color;
    const progress = Math.min((s.points % (s.points >= 500 ? 500 : s.points >= 300 ? 200 : s.points >= 150 ? 150 : s.points >= 50 ? 100 : 50)) / (s.points >= 500 ? 500 : s.points >= 300 ? 200 : s.points >= 150 ? 150 : s.points >= 50 ? 100 : 50) * 100, 100);
    document.getElementById('progressFill').style.width = progress + '%';
    const tagsEl = document.getElementById('countryTags');
    tagsEl.innerHTML = '';
    s.countries.forEach(c => {
        const tag = document.createElement('span');
        tag.className = 'country-tag';
        tag.textContent = (COUNTRY_FLAGS[c] || '') + ' ' + getCountryName(c);
        tagsEl.appendChild(tag);
    });
    statsModal.classList.add('show');
}

// ===================== LEADERBOARD =====================
function showLeaderboard() {
    socket.emit('getLeaderboard');
}

// ===================== CONTENT MODERATION (YEAME) =====================
function checkMessage(text) {
    const result = Yeame.analyzeText(text);
    return !result.safe;
}

// ===================== FACE FILTERS =====================
function clearFilterOverlay() {
    if (filterOverlay) filterOverlay.innerHTML = '';
}

function drawFilter() {
    if (!filterOverlay || !localStream || currentFilter === 'none') {
        clearFilterOverlay();
        cancelAnimationFrame(filterAnimFrame);
        return;
    }

    clearFilterOverlay();
    const t = Date.now() / 1000;

    switch (currentFilter) {
        case 'cool': {
            const el = document.createElement('div');
            el.className = 'filter-emoji';
            el.textContent = '😎';
            el.style.cssText = 'position:absolute;top:15%;left:50%;transform:translateX(-50%);font-size:3rem;pointer-events:none;';
            filterOverlay.appendChild(el);
            break;
        }
        case 'crown': {
            const el = document.createElement('div');
            el.className = 'filter-emoji';
            el.textContent = '👑';
            el.style.cssText = 'position:absolute;top:2%;left:50%;transform:translateX(-50%);font-size:3.5rem;pointer-events:none;';
            filterOverlay.appendChild(el);
            break;
        }
        case 'heart': {
            for (let i = 0; i < 8; i++) {
                const el = document.createElement('div');
                el.textContent = '❤️';
                const x = 10 + 80 * ((i * 0.37 + t * 0.3) % 1);
                const y = 10 + 80 * ((i * 0.53 + t * 0.2) % 1);
                const opacity = 0.5 + 0.5 * Math.sin(t * 2 + i);
                el.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-size:1.8rem;opacity:${opacity};pointer-events:none;`;
                filterOverlay.appendChild(el);
            }
            break;
        }
        case 'star': {
            for (let i = 0; i < 10; i++) {
                const el = document.createElement('div');
                el.textContent = '⭐';
                const x = 5 + 90 * ((i * 0.31 + t * 0.15) % 1);
                const y = 5 + 90 * ((i * 0.47 + t * 0.25) % 1);
                const opacity = 0.4 + 0.6 * Math.sin(t * 3 + i);
                el.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-size:1.2rem;opacity:${opacity};pointer-events:none;`;
                filterOverlay.appendChild(el);
            }
            break;
        }
        case 'fire': {
            for (let i = 0; i < 6; i++) {
                const el = document.createElement('div');
                el.textContent = '🔥';
                const x = 10 + 80 * ((i * 0.41 + Math.sin(t + i) * 0.05) % 1);
                const y = 70 + 25 * Math.sin(t * 2 + i * 2);
                const opacity = 0.6 + 0.4 * Math.sin(t * 4 + i);
                el.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-size:2rem;opacity:${opacity};pointer-events:none;`;
                filterOverlay.appendChild(el);
            }
            break;
        }
        case 'rainbow': {
            const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
            const barH = 5;
            colors.forEach((c, i) => {
                const el = document.createElement('div');
                el.style.cssText = `position:absolute;left:0;top:${15 + i * barH}%;width:100%;height:${barH}%;background:${c};opacity:0.3;pointer-events:none;`;
                filterOverlay.appendChild(el);
            });
            break;
        }
        case 'snow': {
            for (let i = 0; i < 15; i++) {
                const el = document.createElement('div');
                el.textContent = '❄️';
                const x = (i * 23 + t * 10) % 100;
                const y = (i * 17 + t * 30) % 100;
                const opacity = 0.5 + 0.5 * Math.sin(t + i);
                el.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-size:1.2rem;opacity:${opacity};pointer-events:none;`;
                filterOverlay.appendChild(el);
            }
            break;
        }
        case 'party': {
            const emojis = ['🎉', '🎊', '🎈', '🪅'];
            for (let i = 0; i < 8; i++) {
                const el = document.createElement('div');
                el.textContent = emojis[i % emojis.length];
                const x = (i * 29 + Math.sin(t + i) * 10) % 100;
                const y = (i * 19 + t * 20) % 100;
                el.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-size:1.5rem;opacity:0.6;pointer-events:none;`;
                filterOverlay.appendChild(el);
            }
            break;
        }
    }

    filterAnimFrame = requestAnimationFrame(drawFilter);
}

function setFilter(name) {
    currentFilter = name;
    if (name === 'none') {
        cancelAnimationFrame(filterAnimFrame);
        clearFilterOverlay();
        if (filterOverlay) filterOverlay.style.display = 'none';
    } else {
        if (filterOverlay) filterOverlay.style.display = 'block';
        cancelAnimationFrame(filterAnimFrame);
        drawFilter();
    }
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    const activeChip = document.querySelector(`.filter-chip[data-filter="${name}"]`);
    if (activeChip) activeChip.classList.add('active');
}

// ===================== BASIC HELPERS =====================
function addMsg(text, type) {
    const el = document.createElement('div');
    el.className = 'msg-el ' + type;
    el.textContent = text;
    msgBox.appendChild(el);
    msgBox.scrollTop = msgBox.scrollHeight;
}

function setStatus(text, color) {
    statusLabel.textContent = text;
    statusDot.className = 'pulse-dot ' + color;
}

function showIdle(text) {
    remoteIdle.classList.remove('hidden');
    idleText.textContent = text;
    remoteFlag.textContent = '';
}

function hideIdle() {
    remoteIdle.classList.add('hidden');
}

function showCaption(text) {
    captionBar.textContent = text;
    captionBar.style.display = 'block';
    clearTimeout(captionBar._timer);
    captionBar._timer = setTimeout(() => { captionBar.style.display = 'none'; }, 4000);
}

// ===================== CAMERA =====================
async function initCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        localVideo.onloadedmetadata = () => {
            if (currentFilter !== 'none') drawFilter();
        };
        return true;
    } catch (e) {
        console.error('Camera error:', e);
        addMsg(ct('messages.cameraError'), 'sys');
        setStatus(ct('status.cameraError'), 'red');
        return false;
    }
}

// ===================== WEBRTC =====================
function createPeerConnection(isInitiator) {
    closePeerConnection();
    peerConnection = new RTCPeerConnection(RTC_CONFIG);

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            hideIdle();
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { signal: { type: 'ice-candidate', candidate: event.candidate } });
        }
    };

    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (state === 'connected') setStatus(ct('status.connected'), 'green');
        else if (state === 'disconnected' || state === 'failed') setStatus(ct('status.disconnected'), 'red');
    };

    if (isInitiator) {
        peerConnection.onnegotiationneeded = async () => {
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('signal', { signal: { type: 'offer', sdp: peerConnection.localDescription } });
            } catch (e) { console.error('Offer error:', e); }
        };
    }

    return peerConnection;
}

function closePeerConnection() {
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    remoteVideo.srcObject = null;
}

// ===================== SEARCH =====================
let searchInterval = null;

function startSearch() {
    isSearching = true;
    showIdle(ct('messages.searching'));
    setStatus(ct('status.searching'), 'red');
    addMsg(ct('messages.searching'), 'sys');
    socket.emit('findMatch', { gender: myGender, country: myCountry, prefGender: myPrefGender });

    clearInterval(searchInterval);
    searchInterval = setInterval(() => {
        if (isSearching && !currentRoomId) {
            console.log('Retrying search...');
            socket.emit('findMatch', { gender: myGender, country: myCountry, prefGender: myPrefGender });
        }
    }, 5000);
}

let chatStartTime = null;

function handleSkip() {
    if (chatStartTime && currentRoomId) {
        recordChatEnd(partnerCountry);
    }
    socket.emit('skip');
    closePeerConnection();
    showIdle(ct('messages.searching'));
    setStatus(ct('status.searching'), 'red');
    isSearching = true;
    chatStartTime = null;
    partnerCountry = null;
    captionBar.style.display = 'none';
}

function handleStop() {
    if (chatStartTime && currentRoomId) {
        recordChatEnd(partnerCountry);
    }
    socket.emit('stopChat');
    closePeerConnection();
    showIdle(ct('messages.stopped'));
    setStatus(ct('status.stopped'), 'red');
    isSearching = false;
    currentRoomId = null;
    chatStartTime = null;
    partnerCountry = null;
    captionBar.style.display = 'none';
}

// ===================== SOCKET EVENTS =====================
socket.on('onlineCount', () => {});

socket.on('searching', () => {
    isSearching = true;
    showIdle(ct('messages.searching'));
    setStatus(ct('status.searching'), 'red');
});

socket.on('matchFound', async (data) => {
    currentRoomId = data.roomId;
    isSearching = false;
    clearInterval(searchInterval);
    chatStartTime = Date.now();
    partnerCountry = data.partnerCountry || null;
    if (data.partnerCountry && COUNTRY_FLAGS[data.partnerCountry]) {
        remoteFlag.textContent = COUNTRY_FLAGS[data.partnerCountry];
    } else {
        remoteFlag.textContent = '\u{1F30D}';
    }
    addMsg(ct('messages.connected'), 'sys');

    const s = getStats();
    if (!s.startTime) { s.startTime = Date.now(); saveStats(s); }

    createPeerConnection(data.isInitiator);
});

socket.on('signal', async (data) => {
    if (!peerConnection) return;
    try {
        if (data.signal.type === 'offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('signal', { signal: { type: 'answer', sdp: peerConnection.localDescription } });
        } else if (data.signal.type === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
        } else if (data.signal.type === 'ice-candidate') {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
    } catch (e) { console.error('Signal error:', e); }
});

socket.on('newMessage', (data) => {
    const moderated = Yeame.moderateIncoming(data.text);
    if (moderated === null) {
        addMsg(ct('messages.blocked'), 'sys');
        return;
    }
    addMsg(moderated, 'recv');
    showCaption(moderated);
});

socket.on('partnerDisconnected', () => {
    if (chatStartTime && currentRoomId) {
        recordChatEnd(partnerCountry);
    }
    closePeerConnection();
    isSearching = false;
    currentRoomId = null;
    chatStartTime = null;
    partnerCountry = null;
    showIdle(ct('messages.skipped'));
    setStatus(ct('status.disconnected'), 'red');
    addMsg(ct('messages.left'), 'sys');
    captionBar.style.display = 'none';
});

socket.on('startSearch', () => startSearch());

socket.on('leaderboard', (list) => {
    const el = document.getElementById('leaderList');
    el.innerHTML = '';
    const medals = ['&#129351;', '&#129352;', '&#129353;'];
    list.forEach((u, i) => {
        const row = document.createElement('div');
        row.className = 'leader-row';
        row.innerHTML = `<span class="leader-rank">${medals[i] || (i + 1)}</span><span class="leader-name">${u.name || 'مجهول'}</span><span class="leader-pts">${u.points} نقطة</span>`;
        el.appendChild(row);
    });
    leaderModal.classList.add('show');
});

// ===================== BUTTON EVENTS =====================
skipBtn.addEventListener('click', handleSkip);
stopBtn.addEventListener('click', handleStop);

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    muteBtn.classList.toggle('active', isMuted);
});

camBtn.addEventListener('click', () => {
    isCamOff = !isCamOff;
    if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = !isCamOff);
    camBtn.classList.toggle('active', isCamOff);
});

sendBtn.addEventListener('click', () => {
    const text = msgInput.value.trim();
    if (!text) return;

    const moderated = Yeame.moderateOutgoing(text);
    if (moderated === null) return;

    addMsg(moderated, 'sent');
    socket.emit('sendMessage', { text: moderated });
    msgInput.value = '';
});

msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

reportBtn.addEventListener('click', () => reportModal.classList.add('show'));
cancelReport.addEventListener('click', () => reportModal.classList.remove('show'));
submitReport.addEventListener('click', () => {
    const sel = document.querySelector('input[name="rpt"]:checked');
    if (sel) {
        addMsg(ct('messages.reported'), 'sys');
        reportModal.classList.remove('show');
        handleSkip();
    }
});

statsBtn.addEventListener('click', showStats);
closeStats.addEventListener('click', () => statsModal.classList.remove('show'));
closeLeader.addEventListener('click', () => leaderModal.classList.remove('show'));

warningOk.addEventListener('click', () => {
    contentWarning.classList.remove('show');
    handleSkip();
});

document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => setFilter(chip.dataset.filter));
});

// ===================== YEAME VIDEO ANALYSIS =====================
function startVideoAnalysis() {
    setInterval(() => {
        if (remoteVideo && remoteVideo.srcObject && !remoteVideo.paused) {
            Yeame.analyzeVideo(remoteVideo);
        }
    }, 2500);
}

// ===================== INIT =====================
setInterval(() => { fetch('/ping').catch(() => {}); }, 300000);

socket.on('connect', () => {
    console.log('Connected to server');
    setStatus(ct('status.connected'), 'green');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    setStatus(ct('status.disconnected'), 'red');
    addMsg(ct('messages.disconnected'), 'sys');
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    setStatus(ct('status.error'), 'red');
});

(async () => {
    const ok = await initCamera();
    if (ok) {
        setTimeout(() => startSearch(), 1500);
        startVideoAnalysis();
    }

    const s = getStats();
    pointsDisplay.textContent = s.points;
})();
