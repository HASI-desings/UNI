// ============================================
// LANDING HERO — FIGURINE CAROUSEL
// Vanilla JS port of the TOONHUB carousel mechanic
// ============================================

(function () {
    const IMAGES = [
        { src: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/1.02464a56.png', bg: '#F4845F' },
        { src: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/2.b977faab.png', bg: '#6BBF7A' },
        { src: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/3.4df853b4.png', bg: '#E882B4' },
        { src: 'https://fifth-gentle-45902158.figma.site/_components/v2/4de492f6d9cf8244ad5293233e5c6f52407d42fc/4.4457fbce.png', bg: '#6EB5FF' },
    ];

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
    let heroEl, trackEl, ghostEl;
    let initialized = false;

    function preloadImages() {
        IMAGES.forEach((item) => {
            const img = new Image();
            img.src = item.src;
        });
    }

    function rolesForIndex(index) {
        return {
            center: index,
            left: (index + 3) % 4,
            right: (index + 1) % 4,
            back: (index + 2) % 4,
        };
    }

    function render() {
        const roles = rolesForIndex(activeIndex);
        // roleByImageIndex[i] tells us which role image i currently plays
        const roleByImageIndex = {};
        Object.entries(roles).forEach(([role, imgIndex]) => {
            roleByImageIndex[imgIndex] = role;
        });

        itemEls.forEach((el, i) => {
            const role = roleByImageIndex[i];
            el.classList.remove(...ALL_ROLE_CLASSES);
            el.classList.add(ROLE_CLASS[role]);
        });

        heroEl.style.backgroundColor = IMAGES[activeIndex].bg;
    }

    function navigate(direction) {
        if (isAnimating) return;
        isAnimating = true;

        activeIndex = direction === 'next'
            ? (activeIndex + 1) % 4
            : (activeIndex + 3) % 4;

        render();

        window.setTimeout(() => {
            isAnimating = false;
        }, ANIMATION_MS);
    }

    function buildItems() {
        trackEl.innerHTML = '';
        itemEls = IMAGES.map((item, i) => {
            const el = document.createElement('div');
            el.className = 'hero-carousel__item';
            el.dataset.index = String(i);

            const img = document.createElement('img');
            img.src = item.src;
            img.alt = '';
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
})();
