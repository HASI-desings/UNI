// ============================================
// LANDING HERO — CHARACTER CAROUSEL
// Each of the 5 users owns one character + one theme color.
// This file is the single source of truth for that mapping —
// the login screen and the dashboard both read from
// `window.Parallax.CHARACTERS` so everything stays in sync.
// ============================================

(function () {
    // Each character is paired with the asset whose outfit color matches
    // their theme color. Hussnain keeps the blue-hoodie asset (paired with
    // purple) since only 4 distinct assets exist for 5 people — Haroon
    // shares that same asset, now recolored to match its blue outfit.
    const CHARACTERS = [
        { key: 'hussnain', name: 'Hussnain', color: '#8B5CF6', image: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/1.02464a56.png' },
        { key: 'haroon', name: 'Haroon', color: '#3B82F6', image: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/1.02464a56.png' },
        { key: 'mahdiya', name: 'Mahdiya', color: '#22C55E', image: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/2.b977faab.png' },
        { key: 'alima', name: 'Alima', color: '#EC4899', image: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/3.4df853b4.png' },
        { key: 'faizan', name: 'Faizan', color: '#F4845F', image: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/4.4457fbce.png' },
    ];

    const COUNT = CHARACTERS.length;
    const ANIMATION_MS = 650;
    const ROLE_CLASS = {
        center: 'hero-carousel__item--center',
        left: 'hero-carousel__item--left',
        right: 'hero-carousel__item--right',
        back: 'hero-carousel__item--back',
    };
    const ALL_ROLE_CLASSES = Object.values(ROLE_CLASS);

    let activeIndex = 0;
    let isAnimating = false;
    let itemEls = [];
    let heroEl, trackEl, nameEl, discoverLabelEl;
    let initialized = false;
    const changeListeners = [];

    function preloadImages() {
        const seen = new Set();
        CHARACTERS.forEach((c) => {
            if (seen.has(c.image)) return;
            seen.add(c.image);
            const img = new Image();
            img.src = c.image;
        });
    }

    // Roles for a 5-item ring: center, one left, one right, the rest "back".
    function rolesForIndex(index) {
        const left = (index + COUNT - 1) % COUNT;
        const right = (index + 1) % COUNT;
        const back = [];
        for (let i = 0; i < COUNT; i++) {
            if (i !== index && i !== left && i !== right) back.push(i);
        }
        return { center: index, left, right, back };
    }

    // Blends a hex color toward near-black in plain JS — avoids CSS
    // color-mix(), which isn't supported on all mobile browsers and was
    // silently breaking the background color on some phones.
    function blendTowardDark(hex, amount) {
        const clean = hex.replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        const base = 4; // #040404
        const mix = (channel) => Math.round(channel * amount + base * (1 - amount));
        return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
    }

    function applyTheme(character) {
        const root = document.documentElement.style;
        root.setProperty('--user-color', character.color);
        root.setProperty('--color-background', blendTowardDark(character.color, 0.14));
        root.setProperty('--color-primary', character.color);
    }

    function render() {
        const roles = rolesForIndex(activeIndex);
        const roleByImageIndex = {};
        roleByImageIndex[roles.center] = 'center';
        roleByImageIndex[roles.left] = 'left';
        roleByImageIndex[roles.right] = 'right';
        roles.back.forEach((i) => { roleByImageIndex[i] = 'back'; });

        itemEls.forEach((el, i) => {
            const role = roleByImageIndex[i];
            el.classList.remove(...ALL_ROLE_CLASSES);
            el.classList.add(ROLE_CLASS[role]);
        });

        const active = CHARACTERS[activeIndex];
        heroEl.style.backgroundColor = active.color;
        if (nameEl) nameEl.textContent = active.name;
        if (discoverLabelEl) discoverLabelEl.textContent = `Continue as ${active.name}`;
        applyTheme(active);

        changeListeners.forEach((fn) => fn(active));
    }

    function setActiveIndex(index, { animate = true } = {}) {
        if (animate && isAnimating) return;
        activeIndex = ((index % COUNT) + COUNT) % COUNT;

        if (animate) {
            itemEls.forEach((el) => {
                el.classList.remove('is-switching');
                void el.offsetWidth; // restart the animation even if mid-flight
                el.classList.add('is-switching');
            });
        }

        render();

        if (animate) {
            isAnimating = true;
            window.setTimeout(() => {
                isAnimating = false;
                itemEls.forEach((el) => el.classList.remove('is-switching'));
            }, ANIMATION_MS);
        }
    }

    function setActiveByKey(key, opts) {
        const idx = CHARACTERS.findIndex((c) => c.key === key);
        if (idx !== -1) setActiveIndex(idx, opts);
    }

    function navigate(direction) {
        if (isAnimating) return;
        setActiveIndex(activeIndex + (direction === 'next' ? 1 : -1));
    }

    function buildItems() {
        trackEl.innerHTML = '';
        itemEls = CHARACTERS.map((c) => {
            const el = document.createElement('div');
            el.className = 'hero-carousel__item';

            const img = document.createElement('img');
            img.src = c.image;
            img.alt = c.name;
            img.draggable = false;

            el.appendChild(img);
            trackEl.appendChild(el);
            return el;
        });
    }

    function init() {
        if (initialized) return;

        heroEl = document.getElementById('hero-carousel');
        trackEl = document.getElementById('hero-carousel-track');
        if (!heroEl || !trackEl) return;

        nameEl = document.getElementById('hero-carousel-name');
        discoverLabelEl = document.getElementById('hero-carousel-discover-label');

        preloadImages();
        buildItems();
        render();

        const prevBtn = document.getElementById('hero-carousel-prev');
        const nextBtn = document.getElementById('hero-carousel-next');
        if (prevBtn) prevBtn.addEventListener('click', () => navigate('prev'));
        if (nextBtn) nextBtn.addEventListener('click', () => navigate('next'));

        initialized = true;
    }

    document.addEventListener('DOMContentLoaded', init);

    // Shared API consumed by app.js (login screen + dashboard theming)
    window.Parallax = window.Parallax || {};
    window.Parallax.CHARACTERS = CHARACTERS;
    window.Parallax.getCharacter = (key) => CHARACTERS.find((c) => c.key === key);
    window.Parallax.applyTheme = (key) => {
        const c = window.Parallax.getCharacter(key);
        if (c) applyTheme(c);
    };
    window.Parallax.setActiveByKey = setActiveByKey;
    window.Parallax.getActiveCharacter = () => CHARACTERS[activeIndex];
    window.Parallax.onCharacterChange = (fn) => changeListeners.push(fn);
})();
