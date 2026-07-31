// ===================== YEAME SYSTEM =====================
// Your Eyes Is My Eyes - Advanced Protection System

const Yeame = {
    violations: 0,
    maxViolations: 3,
    isActive: true,
    lastVideoCheck: 0,
    videoCheckInterval: 2000,
    prevFrameData: null,
    statusEl: null,
    alertTimer: null,

    // ===================== TEXT PROFANITY DATABASE =====================
    badWords: {
        sexual_en: [
            'nude', 'naked', 'sex', 'porn', 'xxx', 'nsfw', 'sexy', 'booty',
            'boobs', 'tits', 'ass', 'dick', 'penis', 'vagina', 'pussy',
            'cum', 'orgasm', 'masturbat', 'handjob', 'blowjob', 'hentai',
            'erotic', 'fetish', 'bdsm', 'slut', 'whore', 'hooker',
            'onlyfans', 'camgirl', 'stripper', 'lapdance', 'topless',
            'underwear', 'lingerie', 'bikini', 'cleavage'
        ],
        sexual_ar: [
            'عري', 'عاري', 'جنس', 'جنسي', 'إباحي', 'إباحية',
            'مثير', 'مثيرة', 'طيز', 'بزاز', 'كس', 'زب',
            'نيك', 'xnxx', 'بورن', 'شذوذ', 'لواط',
            'صور عارية', 'فيديو جنسي', 'كام سكس', 'لحس', 'مص',
            'قحبة', 'فاحرة', 'عاهرة', 'زانية',
            'كسكي مهتري', 'يا شرموطة', 'مصيه', 'يا شرموطا', 'يا بنت القحبة'
        ],
        racism_en: [
            'nigger', 'nigga', 'spic', 'chink', 'wetback', 'towelhead',
            'kike', 'gook', 'cracker', 'redneck', 'white trash',
            'beaner', 'darkie', 'coon', 'ape', 'monkey'
        ],
        racism_ar: [
            'negro', 'زنوج', 'كحّال', 'أسود قذر', 'حقير',
            'عبيد', 'عبد', 'abeed', 'khawaja', 'خواجة'
        ],
        insults_en: [
            'fuck', 'shit', 'bitch', 'asshole', 'dickhead', 'bastard',
            'damn', 'crap', 'stupid', 'idiot', 'moron', 'retard',
            'loser', 'ugly', 'fat', 'disgusting', 'pathetic',
            'kill yourself', 'kys', 'die', 'rape', 'molest'
        ],
        insults_ar: [
            'كسمك', 'كس امك', 'ي ابن اللذين', 'حقير', 'وسخ',
            'تافه', 'خنزير', 'كلب', 'حمار', 'بغل',
            'ابن متناكه', 'مقرف', 'قذر', 'وسخ',
            'اركع', 'العمى', 'انذل منك', 'غبي', 'احمق',
            'شيطان', 'تاج راسك', 'لا حول', ' يلعن',
            'يلعنك', 'الله يلعنك', 'ارميه', 'تبي تموت', 'انتحر'
        ],
        drugs_en: [
            'weed', 'marijuana', 'cocaine', 'heroin', 'meth', 'crack',
            'lsd', 'mdma', 'ecstasy', 'ketamine', 'opioid', 'fentanyl',
            'drug dealer', 'get high', 'blunt', 'joint'
        ],
        drugs_ar: [
            'حشيش', 'بانجو', 'ماريوانا', 'كوكايين', 'هيروين',
            'مخدرات', 'مخدر', 'شمة', 'استنشاق', 'جوانة'
        ],
        spam: [
            'snapchat', 'snap:', 'ig:', 'instagram:', 'tiktok:',
            'follow me', 'add me', 'my number', 'whatsapp',
            'اتصل علي', 'رقمي', 'واتساب', 'سنابي',
            'انستا', 'تيك توك', '追我', 'ادعمني'
        ]
    },

    // ===================== INIT =====================
    init() {
        this.statusEl = document.getElementById('yeameStatus');
        this.updateStatus('active');
        console.log('[Yeame] Protection system initialized');
    },

    updateStatus(status) {
        if (!this.statusEl) return;
        this.statusEl.className = 'yeame-status ' + status;
        const badge = document.getElementById('yeameBadge');
        if (badge) badge.className = 'yeame-badge ' + status;
    },

    // ===================== TEXT ANALYSIS =====================
    analyzeText(text) {
        if (!this.isActive) return { safe: true };
        const lower = text.toLowerCase().trim();
        const results = { safe: true, type: null, severity: 0 };

        const categories = [
            { key: 'sexual_en', severity: 3, type: 'محتوى جنسي' },
            { key: 'sexual_ar', severity: 3, type: 'محتوى جنسي' },
            { key: 'racism_en', severity: 3, type: 'عنصرية' },
            { key: 'racism_ar', severity: 3, type: 'عنصرية' },
            { key: 'insults_en', severity: 2, type: 'شتيمة أو إهانة' },
            { key: 'insults_ar', severity: 2, type: 'شتيمة أو إهانة' },
            { key: 'drugs_en', severity: 2, type: 'مخدرات' },
            { key: 'drugs_ar', severity: 2, type: 'مخدرات' },
            { key: 'spam', severity: 1, type: 'سبام أو إعلانات' }
        ];

        for (const cat of categories) {
            const words = this.badWords[cat.key];
            for (const word of words) {
                if (lower.includes(word.trim())) {
                    results.safe = false;
                    results.type = cat.type;
                    results.severity = cat.severity;
                    return results;
                }
            }
        }

        return results;
    },

    // ===================== VIDEO ANALYSIS =====================
    analyzeVideo(videoElement) {
        if (!this.isActive || !videoElement || !videoElement.videoWidth) return;

        const now = Date.now();
        if (now - this.lastVideoCheck < this.videoCheckInterval) return;
        this.lastVideoCheck = now;

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const sampleW = 64;
            const sampleH = 48;
            canvas.width = sampleW;
            canvas.height = sampleH;

            ctx.drawImage(videoElement, 0, 0, sampleW, sampleH);
            const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
            const data = imageData.data;

            // 1. Skin color detection
            let skinPixels = 0;
            const totalPixels = sampleW * sampleH;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                if (this.isSkinColor(r, g, b)) {
                    skinPixels++;
                }
            }

            const skinRatio = skinPixels / totalPixels;

            // 2. Motion detection (compare with previous frame)
            let motionScore = 0;
            if (this.prevFrameData) {
                for (let i = 0; i < data.length; i += 16) {
                    const diff = Math.abs(data[i] - this.prevFrameData[i]) +
                                 Math.abs(data[i + 1] - this.prevFrameData[i + 1]) +
                                 Math.abs(data[i + 2] - this.prevFrameData[i + 2]);
                    if (diff > 60) motionScore++;
                }
            }

            this.prevFrameData = new Uint8ClampedArray(data);

            // Thresholds
            if (skinRatio > 0.65) {
                this.triggerViolation('محتوى غير لائق - تم اكتشاف حركات مشبوهة', 3);
                return 'high';
            } else if (skinRatio > 0.50) {
                this.showYeameAlert('تنبيه Yeame', 'يرجى ارتداء ملابس مناسبة', 'warning');
                return 'medium';
            }

            if (motionScore > 200 && skinRatio > 0.35) {
                this.showYeameAlert('تنبيه Yeame', 'تم اكتشاف حركة مشبوهة', 'warning');
                return 'low';
            }

            // All good
            if (skinRatio < 0.15) {
                this.updateStatus('active');
            }

        } catch (e) {
            // Canvas security error - silently ignore
        }
    },

    isSkinColor(r, g, b) {
        // HSV-based skin color detection
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        // Must have enough brightness
        if (max < 80 || min < 15) return false;
        if (max - min < 15) return false;

        // Check RGB ratios for skin tones
        if (r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            (r - g) > 15 &&
            Math.abs(r - g) > 15) {
            return true;
        }

        // HSV ranges for skin
        let h = 0;
        const d = max - min;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
            if (h < 0) h += 360;
        }

        const s = max === 0 ? 0 : (d / max) * 100;
        const v = (max / 255) * 100;

        if (h >= 0 && h <= 50 && s >= 15 && s <= 70 && v >= 30) {
            return true;
        }

        return false;
    },

    // ===================== VIOLATIONS =====================
    triggerViolation(message, severity) {
        this.violations++;
        this.updateStatus('danger');

        if (this.violations >= this.maxViolations) {
            this.showYeameAlert('Yeame - تم الحظر', 'تم حظرك مؤقتاً بسبب مخالفات متكررة', 'danger');
            if (typeof handleStop === 'function') handleStop();
            this.violations = 0;
            setTimeout(() => this.updateStatus('active'), 30000);
        } else {
            this.showYeameAlert('Yeame', message, 'danger');
            if (typeof handleSkip === 'function') {
                setTimeout(() => handleSkip(), 1500);
            }
        }
    },

    showYeameAlert(title, text, level) {
        const alertEl = document.getElementById('yeameAlert');
        const titleEl = document.getElementById('yeameAlertTitle');
        const textEl = document.getElementById('yeameAlertText');
        if (!alertEl) return;

        titleEl.textContent = title;
        textEl.textContent = text;
        alertEl.className = 'yeame-alert show ' + level;

        clearTimeout(this.alertTimer);
        this.alertTimer = setTimeout(() => {
            alertEl.className = 'yeame-alert';
        }, 3000);
    },

    // ===================== CHAT TEXT MODERATION =====================
    moderateIncoming(text) {
        const result = this.analyzeText(text);
        if (!result.safe) {
            this.showYeameAlert('Yeame', 'تم حجب رسالة - ' + result.type, 'warning');
            return null;
        }
        return text;
    },

    moderateOutgoing(text) {
        const result = this.analyzeText(text);
        if (!result.safe) {
            this.showYeameAlert('Yeame', 'لا يمكنك إرسال هذا - ' + result.type, 'danger');
            this.triggerViolation('رسالة مخالف: ' + result.type, result.severity);
            return null;
        }
        return text;
    }
};

// Auto-init on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => Yeame.init());
}
