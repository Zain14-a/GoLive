async function detectCountry() {
    try {
        const r = await fetch('https://ipwho.is/', { mode: 'cors' });
        const d = await r.json();
        if (d && d.success !== false && d.country_code) {
            return { country: d.country_code, name: d.country || '' };
        }
    } catch (e) {}
    try {
        const g = await (await fetch('/api/geo')).json();
        if (g && g.country && g.country !== 'any') {
            return { country: g.country, name: g.name || '' };
        }
    } catch (e) {}
    return null;
}
