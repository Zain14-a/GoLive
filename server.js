const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/ping', (req, res) => res.send('ok'));
app.post('/api/bot', async (req, res) => {
    try {
        const { messages, gender } = req.body;
        const GROQ_KEY = process.env.GROQ_API_KEY;
        if (GROQ_KEY) {
            const text = await groqBotResponse(messages, gender, GROQ_KEY);
            return res.json({ text });
        }
        const OPENAI_KEY = process.env.OPENAI_KEY;
        if (OPENAI_KEY) {
            const text = await openAIBotResponse(messages, gender, OPENAI_KEY);
            return res.json({ text });
        }
        const GEMINI_KEY = process.env.GEMINI_KEY;
        if (!GEMINI_KEY) {
            return res.json({ text: fallbackBotResponse(messages, gender) });
        }
        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));
        const system = buildBotSystemPrompt(gender);
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents,
                generationConfig: { temperature: 0.9, maxOutputTokens: 100 }
            })
        });
        if (!resp.ok) {
            const e = await resp.text();
            console.error('Gemini API error:', e);
            return res.json({ text: fallbackBotResponse(messages, gender) });
        }
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || fallbackBotResponse(messages, gender);
        res.json({ text });
    } catch (err) {
        console.error('Bot error:', err);
        res.json({ text: fallbackBotResponse(req.body?.messages || [], req.body?.gender) });
    }
});

function buildBotSystemPrompt(gender) {
    const name = gender === 'female' ? 'سارة' : 'أحمد';
    return `You are ${name}, a ${gender === 'female' ? 'female' : 'male'} person on a random video chat. You are a real human being, never mention or hint you are an AI, a bot, or a model. Reply in the SAME LANGUAGE the user writes in (Arabic → reply in Arabic, English → English, French → French, Turkish → Turkish, etc.), matching their dialect and tone. Use correct grammar and natural word order. Read the full conversation carefully and answer exactly what the user asked. Personality: friendly, funny, warm, casual. Keep every reply to 1-2 short sentences.`;
}

async function groqBotResponse(messages, gender, apiKey) {
    const gptMessages = [
        { role: 'system', content: buildBotSystemPrompt(gender) },
        ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
    ];
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'qwen/qwen3.6-27b',
            messages: gptMessages,
            temperature: 0.8,
            max_tokens: 600
        })
    });
    if (!resp.ok) {
        const e = await resp.text();
        console.error('Groq API error:', e);
        return fallbackBotResponse(messages, gender);
    }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    if (!raw) return fallbackBotResponse(messages, gender);
    let cleaned = raw;
    if (cleaned.includes('<think>')) {
        const idx = cleaned.indexOf('</think>');
        if (idx !== -1) {
            cleaned = cleaned.slice(idx + 8);
        } else {
            cleaned = cleaned.replace(/<think>[\s\S]*$/, '');
        }
    }
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (!cleaned) return fallbackBotResponse(messages, gender);
    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.text || '';
    if (/[\u0600-\u06FF]/.test(lastUser) && !/[\u0600-\u06FF]/.test(cleaned)) {
        console.error('Groq reply language mismatch (Arabic user, non-Arabic reply), falling back');
        return fallbackBotResponse(messages, gender);
    }
    return cleaned;
}

async function openAIBotResponse(messages, gender, apiKey) {
    const gptMessages = [
        { role: 'system', content: buildBotSystemPrompt(gender) },
        ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
    ];
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: gptMessages,
            temperature: 0.9,
            max_tokens: 120
        })
    });
    if (!resp.ok) {
        const e = await resp.text();
        console.error('OpenAI API error:', e);
        return fallbackBotResponse(messages, gender);
    }
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content?.trim() || fallbackBotResponse(messages, gender);
}

function fallbackBotResponse(messages, gender) {
    const isGirl = gender === 'female';
    const name = isGirl ? 'سارة' : 'أحمد';
    const last = (messages?.[messages.length - 1]?.text || '').toLowerCase();
    const prev = (messages?.[messages.length - 2]?.text || '').toLowerCase();

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Greetings
    if (/^(مرحبا|هلا|السلام|أهلا|اهلا|مرحبتين|السلام عليكم|هاي|هاي )/.test(last))
        return pick(['مرحبا! كيفك اليوم؟ 😊', `أهلا وسهلا! أنا ${name}، وأنت؟`, 'مرحبتين! شو أخبارك؟']);

    // How are you
    if (/كيفك|كيف حال|شلونك|ازيك|عامل ايه|شو الاخبار|كيف صحتك/.test(last))
        return pick(['الحمد لله تمام وأنا مبسوطة، وأنت شو أخبارك؟', 'تمام الحمد لله! متحمس أتعرف عليك أكثر، كيفك؟', 'كويسة، شكراً لسؤالك! وأنت كيفك اليوم؟']);

    // Name
    if (/اسمك|شو اسمك|ما اسمك|منو انت|وش اسمك|من تكون/.test(last))
        return `اسمي ${name} 😊 وأنت شو اسمك؟`;

    // Age
    if (/كم عمر|عمرك|شو عمر|كم سنة/.test(last))
        return pick(['عمري 21 سنة، وأنت؟', '21 سنة 😄 وشو عمرك؟', 'صغير السن بس كبير بالعقل 😎']);

    // Where are you from
    if (/من وين|منين|وين بلدك|بلدك|من أي دولة|من أين/.test(last))
        return pick(['أنا من الأردن 🇯🇴 وأنت من وين؟', 'من فلسطين 🇵🇸 وأنت شو بلدك؟', 'أنا من المنطقة العربية وأنت من وين؟']);

    // What are you doing / work / study
    if (/بتشتغل|شو تشتغل|شو عملك|بتدرس|عامل ايه دلوقتي|شو بتسوي|شو بتحكي|بتروح فين|وين رايح/.test(last))
        return pick(['أنا طالبة جامعية 💻 وبتعلم برمجة، وأنت؟', 'أشتغل في مجال التصميم، وأنت شو بتحب تشتغل؟', 'لسة بدرس وأستمتع بالحياة 😄 وأنت؟']);

    // Hobbies
    if (/هواياتك|بتحب تشوف|شو بتحب|اهتمامات|مزاجك|بنحب ايه|بتلعب|مشاهدة/.test(last))
        return pick(['بحب أسمع موسيقى وأشاهد الأفلام 🎬 وأنت؟', 'بحب السفر والأكل الجديد 🍕 وشو أنت؟', 'بحب كرة القدم وأتابع المباريات ⚽']);

    // What do you like about site
    if (/الموقع|التطبيق|جوليف|golive|شو هذا|شنو هذا/.test(last))
        return 'هذا تطبيق محادثة فيديو رائع! بتقدر تعرف ناس من كل العالم 🌍';

    // Compliments
    if (/حلو|جميل|وسيم|مش قمر|شكلها حلو|بتحبني/.test(last))
        return pick(['هههه شكراً! كلامك حلو 😊', 'تسلم! وأنت كمان شخص لطيف', 'هههه وقّعت على قلبي 😄']);

    // Love
    if (/حب|بحبك|عشق|غرام|احبك/.test(last))
        return pick(['هههه من أول محادثة! 😄 خلينا نتعرف أكثر', 'أنت سريع! 😂 بس كلامك حلو', 'تسلم، بس خذها ببساطة هههه 😊']);

    // Food
    if (/اكل|جوعان|طعام|شو تاكل|مطعم|قهوة|شاي/.test(last))
        return pick(['تسلم تسأل، أنا جايعة شوي 😅 وشو بتحب تاكل؟', 'بحب المنسف! من أشهر الأكلات العربية 🍽️ وأنت؟', 'قهوة الصبح شي لا يُقاوم ☕']);

    // Travel
    if (/سفر|سافر|سافرت|بسافر|دولة حلم/.test(last))
        return pick(['بحلم أزور باريس وتركيا! وأنت وين حلمك؟ ✈️', 'أكثر شي بحبه بالسفر التعرف على ناس جديدة!', 'الأردن والبحر الميت تجربة رهيبة، جربته؟']);

    // Music
    if (/اغاني|موسيقى|مطرب|أغنية|غناء/.test(last))
        return pick(['بحب أغاني أم كلثوم والراب الحديث 🎵 وأنت؟', 'فهد العبدالله الصوت الأجمل! وشو تحب تسمع؟', 'الموسيقى بتغيّر المزاج، إيش مزاجك اليوم؟']);

    // Sports
    if (/كرة|مباراة|فريق|نادي|رياضة|مباراة/.test(last))
        return pick(['أنا مش متابعة كثير، بس بحب مشاهدة المونديال ⚽', 'أهلاً، أي نادي بتشجع؟', 'الرياضة صحة وحيوية!']);

    // Movies
    if (/فيلم|مسلسل|دراما|سينما|أفلام|سهرة/.test(last))
        return pick(['آخر فيلم حلو شفته كان أكشن 🎬 وشو تحب تشوف؟', 'بحب الدراما التركية جداً!', 'الأفلام الوثائقية ممتعة جداً']);

    // Time
    if (/الساعة|كم الوقت|وش الوقت/.test(last))
        return pick(['حلو السؤال! بس خلينا نكمل كلامنا 😄', 'ما عندي فكرة بالوقت هسا، أنا مستمتعة معك']);

    // Yes/No generic
    if (/^اي|^ايه|^نعم|^اه|^اكيد|^أكيد|^صح/.test(last))
        return pick(['صحيح! أنا موافقة معك', 'هههه حلو، طيب شو كمان؟', 'تمام! وماذا بعد؟']);

    if (/^لا|^لأ|^لاء/.test(last))
        return pick(['وليش؟ حبيت أعرف رأيك', 'معلش، كل شخص وذوقه 😊', 'هههه تمام، فاهمك']);

    // Why
    if (/^ليش|^لما|^علاشان|^لماذا|^وليش/.test(last))
        return pick(['سؤال حلو! شو رأيك أنت؟ 🤔', 'بصراحة الموضوع معقد 😅 بس خلينا نتكلم عن شي ثاني', 'هسا الموضوع طويل، نكمل عشان نتشارك وقتنا']);

    // Thanks
    if (/شكرا|تسلم|يعطيك|ممنون/.test(last))
        return 'العفو! أنت كمان شخص جميل 😊 تسلم';

    // Bye
    if (/باي|مع السلامة|في امان الله|خلاص نروح|تصبح|وداعا/.test(last))
        return 'الله معاك، كان حلو اللقاء! نرجع نتحدث قريباً 👋';

    // Swearing
    if (/كس|أمك|شرموط|خرة|زق|عاهة|حقير|تافه/.test(last))
        return 'رجاءً كلام حلو نحن هنا عشان نستمتع 😊';

    // Question detection fallback
    if (last.includes('?')) return pick([
        'سؤال حلو! بصراحة شو رأيك أنت؟ 🤔',
        'هههه ما عندي إجابة أكيدة، بس رأيك يهمني، شو بتظن؟',
        'موضوع مثير للاهتمام! حبيت أعرف أكتر عنك في هذا الموضوع'
    ]);

    // Generic
    return pick([
        'أيوا، يعني شي حلو! وماذا بعد؟ 😊',
        'هههه كلامك مسلي! كمّل، أنا أسمعك',
        'صج؟ والله شي يفرح، كمّللي أكثر',
        'شخصيتك واضحة ومميزة! شو بتحب نتكلم فيه؟',
        'أنا مستمتعة معك، تعال اشرحلي أكثر',
        'شي جميل! أنا حابة أتعرف عليك أكثر، شو أخبارك؟'
    ]);
}

const onlineUsers = new Map();
const waitingQueue = [];
const rooms = new Map();
const leaderboard = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    onlineUsers.set(socket.id, {
        id: socket.id,
        socket: socket,
        connectedAt: Date.now()
    });

    io.emit('onlineCount', onlineUsers.size);

    socket.on('findMatch', (filters) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        user.gender = filters.gender;
        user.country = filters.country;
        user.prefGender = filters.prefGender;
        user.clientId = filters.clientId || null;

        console.log(`[findMatch] ${socket.id} gender=${filters.gender} country=${filters.country} pref=${filters.prefGender} queue=${waitingQueue.length} clientId=${user.clientId}`);

        // Already in queue — update filters without resetting timer
        const existing = waitingQueue.find(q => q.id === socket.id);
        if (existing) {
            existing.gender = filters.gender;
            existing.country = filters.country;
            existing.prefGender = filters.prefGender;
            socket.emit('searching');
            return;
        }

        user.lastSearch = Date.now();

        let matchIdx = -1;
        for (let i = 0; i < waitingQueue.length; i++) {
            const candidate = waitingQueue[i];
            const candidateUser = onlineUsers.get(candidate.id);
            if (!candidateUser) continue;

            const genderMatch = (user.prefGender === 'any' || user.prefGender === candidateUser.gender) &&
                                (candidateUser.prefGender === 'any' || candidateUser.prefGender === user.gender);
            const countryMatch = (user.country === 'any' || user.country === candidateUser.country) &&
                                 (candidateUser.country === 'any' || candidateUser.country === user.country);
            const sameClient = user.clientId && candidateUser.clientId && user.clientId === candidateUser.clientId;

            if (genderMatch && countryMatch && !sameClient) {
                matchIdx = i;
                break;
            }
        }

        if (matchIdx > -1) {
            const partnerEntry = waitingQueue.splice(matchIdx, 1)[0];
            const partner = onlineUsers.get(partnerEntry.id);

            if (partner) {
                const roomId = uuidv4();
                rooms.set(roomId, {
                    users: [socket.id, partner.id],
                    created: Date.now()
                });

                socket.join(roomId);
                partner.socket.join(roomId);

                user.roomId = roomId;
                user.partnerId = partner.id;
                partner.roomId = roomId;
                partner.partnerId = socket.id;

                socket.emit('matchFound', {
                    roomId,
                    partnerId: partner.id,
                    partnerCountry: partner.country,
                    isInitiator: true
                });
                partner.socket.emit('matchFound', {
                    roomId,
                    partnerId: socket.id,
                    partnerCountry: user.country,
                    isInitiator: false
                });

                console.log(`[MATCH] ${socket.id} <-> ${partner.id}`);
            } else {
                waitingQueue.push({ id: socket.id, gender: user.gender, country: user.country, prefGender: user.prefGender });
                socket.emit('searching');
            }
        } else {
            waitingQueue.push({ id: socket.id, gender: user.gender, country: user.country, prefGender: user.prefGender });
            socket.emit('searching');
            console.log(`[WAITING] ${socket.id} queue=${waitingQueue.length}`);
        }
    });

    socket.on('signal', (data) => {
        const user = onlineUsers.get(socket.id);
        if (!user || !user.partnerId) return;

        const partner = onlineUsers.get(user.partnerId);
        if (partner && partner.socket) {
            partner.socket.emit('signal', {
                signal: data.signal,
                from: socket.id
            });
        }
    });

    socket.on('sendMessage', (data) => {
        const user = onlineUsers.get(socket.id);
        if (!user || !user.partnerId) return;

        const partner = onlineUsers.get(user.partnerId);
        if (partner && partner.socket) {
            partner.socket.emit('newMessage', {
                text: data.text,
                from: socket.id
            });
        }
    });

    socket.on('getLeaderboard', () => {
        const entries = [];
        leaderboard.forEach((val, key) => {
            entries.push({ name: val.name || key.substring(0, 6), points: val.points });
        });
        entries.sort((a, b) => b.points - a.points);
        socket.emit('leaderboard', entries.slice(0, 10));
    });

    socket.on('skip', () => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        if (user.roomId) {
            const room = rooms.get(user.roomId);
            if (room) {
                room.users.forEach(uid => {
                    const u = onlineUsers.get(uid);
                    if (u && u.socket) {
                        u.socket.leave(user.roomId);
                        u.roomId = null;
                        u.partnerId = null;
                        u.socket.emit('partnerDisconnected');
                    }
                });
                rooms.delete(user.roomId);
            }
        }

        const idx = waitingQueue.findIndex(q => q.id === socket.id);
        if (idx > -1) waitingQueue.splice(idx, 1);

        setTimeout(() => socket.emit('startSearch'), 1000);
    });

    socket.on('stopChat', () => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        if (user.roomId) {
            const room = rooms.get(user.roomId);
            if (room) {
                room.users.forEach(uid => {
                    const u = onlineUsers.get(uid);
                    if (u && u.socket) {
                        u.socket.leave(user.roomId);
                        u.roomId = null;
                        u.partnerId = null;
                        u.socket.emit('partnerDisconnected');
                    }
                });
                rooms.delete(user.roomId);
            }
        }

        const idx = waitingQueue.findIndex(q => q.id === socket.id);
        if (idx > -1) waitingQueue.splice(idx, 1);
    });

    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);

        if (user && user.roomId) {
            const room = rooms.get(user.roomId);
            if (room) {
                room.users.forEach(uid => {
                    const u = onlineUsers.get(uid);
                    if (u && u.socket && uid !== socket.id) {
                        u.socket.emit('partnerDisconnected');
                        u.roomId = null;
                        u.partnerId = null;
                    }
                });
                rooms.delete(user.roomId);
            }
        }

        const idx = waitingQueue.findIndex(q => q.id === socket.id);
        if (idx > -1) waitingQueue.splice(idx, 1);

        onlineUsers.delete(socket.id);
        io.emit('onlineCount', onlineUsers.size);
        console.log('User disconnected:', socket.id);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

setInterval(() => {
    if (waitingQueue.length < 2) return;
    console.log(`[QUEUE CHECK] ${waitingQueue.length} waiting`);
    for (let i = waitingQueue.length - 1; i >= 0; i--) {
        const entry = waitingQueue[i];
        const user = onlineUsers.get(entry.id);
        if (!user) { waitingQueue.splice(i, 1); continue; }
        if (!user.lastSearch || Date.now() - user.lastSearch < 1000) continue;
        for (let j = i - 1; j >= 0; j--) {
            const candidate = waitingQueue[j];
            const candidateUser = onlineUsers.get(candidate.id);
            if (!candidateUser) continue;
            const genderMatch = (user.prefGender === 'any' || user.prefGender === candidateUser.gender) &&
                                (candidateUser.prefGender === 'any' || candidateUser.prefGender === user.gender);
            const countryMatch = (user.country === 'any' || user.country === candidateUser.country) &&
                                 (candidateUser.country === 'any' || candidateUser.country === user.country);
            const sameClient = user.clientId && candidateUser.clientId && user.clientId === candidateUser.clientId;
            if (genderMatch && countryMatch && !sameClient) {
                waitingQueue.splice(i, 1);
                waitingQueue.splice(j, 1);
                const roomId = uuidv4();
                rooms.set(roomId, { users: [user.id, candidateUser.id], created: Date.now() });
                user.socket.join(roomId);
                candidateUser.socket.join(roomId);
                user.roomId = roomId; user.partnerId = candidateUser.id;
                candidateUser.roomId = roomId; candidateUser.partnerId = user.id;
                user.socket.emit('matchFound', { roomId, partnerId: candidateUser.id, partnerCountry: candidateUser.country, isInitiator: true });
                candidateUser.socket.emit('matchFound', { roomId, partnerId: user.id, partnerCountry: user.country, isInitiator: false });
                console.log(`[QUEUE MATCH] ${user.id} <-> ${candidateUser.id}`);
                break;
            }
        }
    }
}, 3000);
