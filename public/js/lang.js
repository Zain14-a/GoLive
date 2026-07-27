const Lang = (() => {
    const LANG_KEY = 'golive_lang';
    const defaultLang = 'ar';

    function getCurrent() {
        return localStorage.getItem(LANG_KEY) || defaultLang;
    }

    function set(lang) {
        localStorage.setItem(LANG_KEY, lang);
        apply(lang);
        document.documentElement.dir = LANG_DATA[lang]?.dir || 'rtl';
        document.documentElement.lang = lang;
    }

    function t(path) {
        const lang = getCurrent();
        const data = LANG_DATA[lang] || LANG_DATA[defaultLang];
        const keys = path.split('.');
        let val = data;
        for (const k of keys) {
            if (val && typeof val === 'object') val = val[k];
            else return path;
        }
        return val || path;
    }

    function apply(lang) {
        if (!lang) lang = getCurrent();
        const data = LANG_DATA[lang] || LANG_DATA[defaultLang];

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const keys = key.split('.');
            let val = data;
            for (const k of keys) {
                if (val && typeof val === 'object') val = val[k];
                else { val = null; break; }
            }
            if (val !== null && val !== undefined) {
                el.textContent = val;
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const keys = key.split('.');
            let val = data;
            for (const k of keys) {
                if (val && typeof val === 'object') val = val[k];
                else { val = null; break; }
            }
            if (val !== null && val !== undefined) {
                el.placeholder = val;
            }
        });

        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const keys = key.split('.');
            let val = data;
            for (const k of keys) {
                if (val && typeof val === 'object') val = val[k];
                else { val = null; break; }
            }
            if (val !== null && val !== undefined) {
                el.innerHTML = val;
            }
        });
    }

    function buildCountrySelect(selectEl) {
        const lang = getCurrent();
        const data = LANG_DATA[lang] || LANG_DATA[defaultLang];
        const countries = data.countries || {};
        const groups = data.groups || {};

        if (Object.keys(countries).length === 0) return false;

        const regionOrder = [
            { key: 'mideast', codes: ['JO','SA','AE','EG','IQ','KW','QA','BH','OM','LB','SY','PS','TR','IL','IR','CY'] },
            { key: 'africa', codes: ['MA','DZ','TN','LY','SD','YE','MR','SO','DJ','KM','TD','NG','KE','ET','GH','ZA','TZ','UG','RW','CM','SN','CI','ML','BF','NE','GN','BJ','TG','CF','CG','CD','GA','GQ','AO','ZM','ZW','BW','NA','MZ','MG','MW','SC','MU','SS','LR','SL','GM','CV','BI'] },
            { key: 'europe', codes: ['GB','FR','DE','IT','ES','PT','NL','BE','CH','AT','SE','NO','DK','FI','IE','PL','CZ','SK','HU','RO','BG','GR','HR','RS','BA','ME','MK','AL','SI','LT','LV','EE','UA','BY','MD','IS','LU','MT','AD','MC','VA','XK'] },
            { key: 'asia', codes: ['CN','JP','KR','IN','PK','BD','TH','VN','PH','ID','MY','SG','MM','KH','LA','NP','LK','AF','MN','KZ','UZ','TM','KG','TJ','GE','AM','AZ','TW','BN','BT','MV','TL'] },
            { key: 'northAmerica', codes: ['US','CA','MX','GT','HN','SV','NI','CR','PA','CU','JM','HT','DO','PR','TT','BB','BS','BZ','GD','LC','KN','VC','AG','DM'] },
            { key: 'southAmerica', codes: ['BR','AR','CL','CO','PE','VE','EC','BO','PY','UY'] },
            { key: 'oceania', codes: ['AU','NZ','PG','FJ','WS','TO','VU','SB','KI','MH','FM','PW','NR','TV'] }
        ];

        let html = `<option value="any" data-i18n="hero.anyCountry">${data.hero.anyCountry}</option>`;
        regionOrder.forEach(region => {
            const regionLabel = groups[region.key] || region.key;
            html += `<optgroup label="${regionLabel}">`;
            region.codes.forEach(code => {
                if (countries[code]) {
                    html += `<option value="${code}">${countries[code]}</option>`;
                }
            });
            html += `</optgroup>`;
        });

        selectEl.innerHTML = html;
        return true;
    }

    function createLangSelector(container) {
        const current = getCurrent();
        const btn = document.createElement('div');
        btn.className = 'lang-selector';
        btn.innerHTML = `<button class="lang-btn" id="langToggle">${LANG_DATA[current]?.flag || ''} ${LANG_DATA[current]?.label || ''}</button>`;

        const dropdown = document.createElement('div');
        dropdown.className = 'lang-dropdown';
        dropdown.id = 'langDropdown';
        dropdown.style.display = 'none';

        Object.keys(LANG_DATA).forEach(code => {
            const l = LANG_DATA[code];
            const item = document.createElement('div');
            item.className = 'lang-item' + (code === current ? ' active' : '');
            item.innerHTML = `${l.flag} ${l.label}`;
            item.addEventListener('click', () => {
                set(code);
                document.querySelectorAll('.lang-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                dropdown.style.display = 'none';
                btn.querySelector('#langToggle').innerHTML = `${l.flag} ${l.label}`;

                const countrySel = document.getElementById('countrySel');
                if (countrySel) buildCountrySelect(countrySel);

                window.dispatchEvent(new Event('langChanged'));
            });
            dropdown.appendChild(item);
        });

        container.appendChild(btn);
        container.appendChild(dropdown);

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        btn.querySelector('#langToggle').addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
    }

    return { getCurrent, set, t, apply, buildCountrySelect, createLangSelector };
})();
