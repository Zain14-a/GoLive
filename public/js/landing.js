const socket = io();

const goBtn = document.getElementById('goBtn');
const ageCheck = document.getElementById('ageCheck');
const genderSel = document.getElementById('genderSel');
const countrySel = document.getElementById('countrySel');
const prefGenderSel = document.getElementById('prefGenderSel');
const onlineCount = document.getElementById('onlineCount');
const navCount = document.getElementById('navCount');
const todayCount = document.getElementById('todayCount');
const mockImage = document.getElementById('mockImage');
const mockNextBtn = document.getElementById('mockNextBtn');

const phoneImages = ['img/image-4.png', 'img/1.jpg', 'img/2.jpg', 'img/3.jpg'];
let currentImgIndex = 0;

document.documentElement.dir = LANG_DATA[Lang.getCurrent()]?.dir || 'rtl';
document.documentElement.lang = Lang.getCurrent();
Lang.apply();
Lang.buildCountrySelect(countrySel);
Lang.createLangSelector(document.getElementById('langContainer'));
Lang.buildSettingsLangList();

(async () => {
    try {
        const res = await detectCountry();
        const badge = document.getElementById('geoBadge');
        if (!badge || !res) return;
        const lang = Lang.getCurrent();
        const data = LANG_DATA[lang] || LANG_DATA.en;
        const name = (data?.countries && data.countries[res.country]) ||
                     (FALLBACK_COUNTRIES && FALLBACK_COUNTRIES[res.country]) || res.name || res.country;
        const flags = {
            JO: '\u{1F1EF}\u{1F1F4}', SA: '\u{1F1F8}\u{1F1E6}', AE: '\u{1F1E6}\u{1F1EA}',
            EG: '\u{1F1EA}\u{1F1EC}', IQ: '\u{1F1EE}\u{1F1F1}', KW: '\u{1F1F0}\u{1F1FC}',
            QA: '\u{1F1F6}\u{1F1E6}', BH: '\u{1F1E7}\u{1F1ED}', OM: '\u{1F1F4}\u{1F1F2}',
            LB: '\u{1F1F1}\u{1F1E7}', SY: '\u{1F1F8}\u{1F1FE}', PS: '\u{1F1F5}\u{1F1F8}',
            MA: '\u{1F1F2}\u{1F1E6}', DZ: '\u{1F1E9}\u{1F1FF}', TN: '\u{1F1F9}\u{1F1F3}',
            LY: '\u{1F1F1}\u{1F1FE}', SD: '\u{1F1F1}\u{1F1E9}', YE: '\u{1F1FE}\u{1F1EA}',
            US: '\u{1F1FA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}', FR: '\u{1F1EB}\u{1F1F7}',
            DE: '\u{1F1E9}\u{1F1EA}', IT: '\u{1F1EE}\u{1F1F9}', ES: '\u{1F1EA}\u{1F1F8}',
            JP: '\u{1F1EF}\u{1F1F5}', KR: '\u{1F1F0}\u{1F1F7}', CN: '\u{1F1E8}\u{1F1F3}',
            IN: '\u{1F1EE}\u{1F1F3}', TR: '\u{1F1F9}\u{1F1F7}', BR: '\u{1F1E7}\u{1F1F7}',
            CA: '\u{1F1E8}\u{1F1E6}', AU: '\u{1F1E6}\u{1F1FA}', RU: '\u{1F1F7}\u{1F1FA}',
            PK: '\u{1F1F5}\u{1F1F0}', BD: '\u{1F1E7}\u{1F1E9}', TH: '\u{1F1F9}\u{1F1ED}',
            VN: '\u{1F1FB}\u{1F1F3}', PH: '\u{1F1F5}\u{1F1ED}', ID: '\u{1F1EE}\u{1F1E9}',
            MY: '\u{1F1F2}\u{1F1FE}', SG: '\u{1F1F8}\u{1F1EC}'
        };
        badge.textContent = '\u{1F30D} ' + (flags[res.country] || '') + ' ' + name;
        badge.hidden = false;
    } catch (e) {}
})();

window.addEventListener('langChanged', () => {
    Lang.buildSettingsLangList();
    updatePhoneClock();
});

if (mockNextBtn) {
    mockNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImgIndex = (currentImgIndex + 1) % phoneImages.length;
        mockImage.src = phoneImages[currentImgIndex];
    });
}

document.querySelectorAll('.phone-app').forEach(app => {
    app.addEventListener('click', () => {
        const target = app.dataset.app;
        const screen = document.getElementById('phoneScreen');
        screen.querySelectorAll('.phone-page').forEach(p => p.classList.remove('active'));
        const pageId = 'phone' + target.charAt(0).toUpperCase() + target.slice(1);
        const page = document.getElementById(pageId);
        if (page) page.classList.add('active');
    });
});

document.querySelectorAll('.phone-back').forEach(btn => {
    btn.addEventListener('click', () => {
        const screen = document.getElementById('phoneScreen');
        screen.querySelectorAll('.phone-page').forEach(p => p.classList.remove('active'));
        document.getElementById('phoneHome').classList.add('active');
    });
});

document.querySelectorAll('.lin-plan').forEach(plan => {
    plan.addEventListener('click', () => {
        document.querySelectorAll('.lin-plan').forEach(p => p.classList.remove('selected'));
        plan.classList.add('selected');
    });
});

const GALLERY_PIN = '1234';
let enteredPin = '';
const pinDots = document.querySelectorAll('#pinDots .pin-dot');
const pinError = document.getElementById('pinError');
const galleryLock = document.getElementById('galleryLock');
const galleryContent = document.getElementById('galleryContent');

function updatePinDots() {
    pinDots.forEach((d, i) => {
        d.classList.toggle('filled', i < enteredPin.length);
        d.classList.remove('error');
    });
}

document.querySelectorAll('.pin-key[data-key]').forEach(key => {
    key.addEventListener('click', () => {
        if (enteredPin.length >= 4) return;
        enteredPin += key.dataset.key;
        updatePinDots();

        if (enteredPin.length === 4) {
            setTimeout(() => {
                if (enteredPin === GALLERY_PIN) {
                    galleryLock.style.display = 'none';
                    galleryContent.classList.remove('hidden');
                } else {
                    pinDots.forEach(d => d.classList.add('error'));
                    pinError.classList.add('show');
                    setTimeout(() => {
                        enteredPin = '';
                        updatePinDots();
                        pinError.classList.remove('show');
                    }, 800);
                }
            }, 200);
        }
    });
});

document.getElementById('pinDel').addEventListener('click', () => {
    enteredPin = enteredPin.slice(0, -1);
    updatePinDots();
    pinError.classList.remove('show');
});

document.querySelectorAll('.phone-back').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.back === 'home') {
            enteredPin = '';
            updatePinDots();
            galleryLock.style.display = '';
            galleryContent.classList.add('hidden');
            pinError.classList.remove('show');
        }
    });
});

function updatePhoneClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('phoneTime');
    const dateEl = document.getElementById('phoneDate');
    if (timeEl) timeEl.textContent = h + ':' + m;
    const lang = Lang.getCurrent();
    const localeMap = { ar: 'ar', en: 'en', tr: 'tr', fr: 'fr', es: 'es', pt: 'pt', hi: 'hi', ur: 'ur', he: 'he', ru: 'ru', de: 'de' };
    try {
        if (dateEl) {
            dateEl.textContent = new Intl.DateTimeFormat(localeMap[lang] || 'ar', {
                weekday: 'long', day: 'numeric', month: 'long'
            }).format(now);
        }
    } catch (e) {
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        if (dateEl) dateEl.textContent = days[now.getDay()] + '، ' + now.getDate() + ' ' + months[now.getMonth()];
    }
}
updatePhoneClock();
setInterval(updatePhoneClock, 10000);

ageCheck.addEventListener('change', () => {
    goBtn.classList.toggle('disabled', !ageCheck.checked);
});

goBtn.addEventListener('click', (e) => {
    if (!ageCheck.checked) {
        e.preventDefault();
        return;
    }
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('gender', genderSel.value);
    params.set('country', countrySel.value);
    params.set('prefGender', prefGenderSel.value);
    window.location.href = '/chat?' + params.toString();
});

socket.on('onlineCount', (count) => {
    onlineCount.textContent = count.toLocaleString();
    navCount.textContent = count.toLocaleString();
});

let today = 12450;
setInterval(() => {
    today += Math.floor(Math.random() * 3);
    todayCount.textContent = today.toLocaleString();
}, 4000);

(function() {
    const saved = localStorage.getItem('golive_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('golive_theme', next);
    });
})();
