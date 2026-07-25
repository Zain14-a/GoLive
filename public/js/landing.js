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

// Phone image cycling
if (mockNextBtn) {
    mockNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImgIndex = (currentImgIndex + 1) % phoneImages.length;
        mockImage.src = phoneImages[currentImgIndex];
    });
}

// Phone app navigation
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

// Lin plan selection
document.querySelectorAll('.lin-plan').forEach(plan => {
    plan.addEventListener('click', () => {
        document.querySelectorAll('.lin-plan').forEach(p => p.classList.remove('selected'));
        plan.classList.add('selected');
    });
});

// Gallery PIN lock
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

// Reset gallery lock when going back
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

// Phone clock
function updatePhoneClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('phoneTime');
    const dateEl = document.getElementById('phoneDate');
    if (timeEl) timeEl.textContent = h + ':' + m;
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    if (dateEl) dateEl.textContent = days[now.getDay()] + '، ' + now.getDate() + ' ' + months[now.getMonth()];
}
updatePhoneClock();
setInterval(updatePhoneClock, 10000);

// Age check
ageCheck.addEventListener('change', () => {
    goBtn.disabled = !ageCheck.checked;
});

goBtn.addEventListener('click', () => {
    if (!ageCheck.checked) return;
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
