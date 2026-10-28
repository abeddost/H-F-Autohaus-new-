(function () {
    'use strict';

    const GA_MEASUREMENT_ID = 'G-TC9RCN0MWV';
    const COOKIE_CONSENT_KEY = 'hf_cookie_consent_v1';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------------------------------------------------------------------
    // Analytics (only after consent)
    // ---------------------------------------------------------------------
    let analyticsEnabled = false;
    let analyticsLoaded = false;

    function canTrackAnalytics() {
        return analyticsEnabled && typeof window.gtag === 'function';
    }

    function trackPageView() {
        if (!canTrackAnalytics()) {
            return;
        }

        window.gtag('event', 'page_view', {
            page_title: document.title,
            page_location: window.location.href
        });
    }

    function loadGoogleAnalytics() {
        if (analyticsLoaded) {
            trackPageView();
            return;
        }

        analyticsLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function gtag() {
            window.dataLayer.push(arguments);
        };

        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.async = true;
        script.onload = () => {
            window.gtag('js', new Date());
            window.gtag('config', GA_MEASUREMENT_ID);
            trackPageView();
        };

        document.head.appendChild(script);
    }

    function readConsent() {
        try {
            return localStorage.getItem(COOKIE_CONSENT_KEY);
        } catch (error) {
            return null;
        }
    }

    function writeConsent(mode) {
        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, mode);
        } catch (error) {
            // Storage unavailable (private mode); consent applies to this page view only.
        }
    }

    const cookieBanner = document.getElementById('cookieBanner');

    function showCookieBanner() {
        if (cookieBanner) {
            cookieBanner.classList.remove('hidden');
        }
    }

    function hideCookieBanner() {
        if (cookieBanner) {
            cookieBanner.classList.add('hidden');
        }
    }

    function setCookieConsent(mode) {
        writeConsent(mode);
        if (mode === 'accepted') {
            analyticsEnabled = true;
            loadGoogleAnalytics();
        } else {
            analyticsEnabled = false;
        }
        hideCookieBanner();
    }

    const storedConsent = readConsent();
    if (storedConsent === 'accepted') {
        analyticsEnabled = true;
        loadGoogleAnalytics();
    } else if (storedConsent !== 'necessary') {
        showCookieBanner();
    }

    document.getElementById('acceptCookiesBtn')?.addEventListener('click', () => setCookieConsent('accepted'));
    document.getElementById('necessaryCookiesBtn')?.addEventListener('click', () => setCookieConsent('necessary'));
    document.getElementById('openCookieSettings')?.addEventListener('click', showCookieBanner);
    window.openCookieSettings = showCookieBanner;

    // ---------------------------------------------------------------------
    // Navigation: solid on scroll, mobile menu
    // ---------------------------------------------------------------------
    const nav = document.getElementById('siteNav');
    const floatCta = document.getElementById('floatCta');

    function onScroll() {
        const y = window.scrollY;
        nav?.classList.toggle('is-scrolled', y > 24);
        floatCta?.classList.toggle('is-visible', y > window.innerHeight * 0.8);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    function setMenu(open) {
        if (!menuToggle || !mobileMenu) {
            return;
        }
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
        mobileMenu.classList.toggle('is-open', open);
        mobileMenu.setAttribute('aria-hidden', String(!open));
        nav?.classList.toggle('is-solid', open || !document.getElementById('home'));
        document.body.style.overflow = open ? 'hidden' : '';
    }

    menuToggle?.addEventListener('click', () => {
        setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    mobileMenu?.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenu(false));
    });

    // ---------------------------------------------------------------------
    // Scroll reveal
    // ---------------------------------------------------------------------
    const revealEls = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        revealEls.forEach((el) => revealObserver.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add('is-visible'));
    }

    // ---------------------------------------------------------------------
    // Lazy background videos
    // ---------------------------------------------------------------------
    const lazyVideos = document.querySelectorAll('video[data-lazy-video]');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                const video = entry.target;
                video.querySelectorAll('source[data-src]').forEach((source) => {
                    source.src = source.dataset.src;
                    source.removeAttribute('data-src');
                });
                video.load();
                video.play().catch(() => {});
                observer.unobserve(video);
            });
        }, { rootMargin: '250px 0px', threshold: 0.01 });

        lazyVideos.forEach((video) => videoObserver.observe(video));
    }

    if (prefersReducedMotion) {
        document.querySelectorAll('video[autoplay]').forEach((video) => video.pause());
    }

    // ---------------------------------------------------------------------
    // Vehicle gallery
    // ---------------------------------------------------------------------
    document.querySelectorAll('[data-gallery]').forEach((gallery) => {
        const main = gallery.querySelector('[data-gallery-main]');
        const thumbs = [...gallery.querySelectorAll('[data-gallery-thumb]')];
        const indexLabel = gallery.querySelector('[data-gallery-index]');
        if (!main || thumbs.length < 2) {
            return;
        }
        const baseAlt = main.alt.replace(/ – Bild \d+$/, '');
        let current = 0;

        function show(index) {
            current = (index + thumbs.length) % thumbs.length;
            const thumb = thumbs[current];
            main.src = thumb.dataset.medium;
            main.srcset = `${thumb.dataset.medium} 1024w, ${thumb.dataset.full} 1600w`;
            main.alt = `${baseAlt} – Bild ${current + 1}`;
            thumbs.forEach((t, i) => t.classList.toggle('is-active', i === current));
            thumb.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            if (indexLabel) {
                indexLabel.textContent = String(current + 1);
            }
        }

        thumbs.forEach((thumb, i) => thumb.addEventListener('click', (e) => {
            e.preventDefault();
            show(i);
        }));
        gallery.querySelector('[data-gallery-prev]')?.addEventListener('click', () => show(current - 1));
        gallery.querySelector('[data-gallery-next]')?.addEventListener('click', () => show(current + 1));
        gallery.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') show(current - 1);
            if (e.key === 'ArrowRight') show(current + 1);
        });

        let touchX = null;
        main.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
        main.addEventListener('touchend', (e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
            touchX = null;
        });
    });

    // ---------------------------------------------------------------------
    // Homepage "Top-Fahrzeuge" slideshow (native scroll-snap + autoplay)
    // ---------------------------------------------------------------------
    const AUTOPLAY_MS = 2500;

    document.querySelectorAll('[data-carousel]').forEach((carousel) => {
        const track = carousel.querySelector('[data-carousel-track]');
        const slides = [...track.children];
        const dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
        const section = carousel.closest('section') || carousel;
        if (slides.length < 2) {
            return;
        }
        carousel.style.setProperty('--autoplay', `${AUTOPLAY_MS}ms`);
        let current = 0;
        let timer = null;
        let paused = false;
        let inView = false;

        function setActive(index) {
            current = index;
            dots.forEach((dot, i) => {
                const active = i === index;
                dot.classList.toggle('is-active', active);
                if (active) {
                    dot.setAttribute('aria-current', 'true');
                    // Restart the progress animation on the active dot.
                    const bar = dot.firstElementChild;
                    bar.style.animation = 'none';
                    void bar.offsetWidth;
                    bar.style.animation = '';
                } else {
                    dot.removeAttribute('aria-current');
                }
            });
            slides.forEach((slide, i) => slide.toggleAttribute('inert', i !== index));
        }

        function goTo(index) {
            const target = (index + slides.length) % slides.length;
            track.scrollTo({ left: slides[target].offsetLeft - track.offsetLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            setActive(target);
            restart();
        }

        function stop() {
            clearInterval(timer);
            timer = null;
        }

        function restart() {
            stop();
            const running = !prefersReducedMotion && !paused && inView && !document.hidden;
            carousel.classList.toggle('is-playing', running);
            if (running) {
                timer = setInterval(() => goTo(current + 1), AUTOPLAY_MS);
            }
        }

        // Keep dots in sync when the user swipes or scrolls the track directly.
        let scrollTimeout;
        track.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const index = Math.round(track.scrollLeft / track.clientWidth);
                if (index !== current && slides[index]) {
                    setActive(index);
                    restart();
                }
            }, 80);
        }, { passive: true });

        section.querySelector('[data-carousel-prev]')?.addEventListener('click', () => goTo(current - 1));
        section.querySelector('[data-carousel-next]')?.addEventListener('click', () => goTo(current + 1));
        dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') goTo(current - 1);
            if (e.key === 'ArrowRight') goTo(current + 1);
        });

        // Pause while the visitor is interacting with it.
        const pause = () => { paused = true; restart(); };
        const resume = () => { paused = false; restart(); };
        carousel.addEventListener('mouseenter', pause);
        carousel.addEventListener('mouseleave', resume);
        carousel.addEventListener('focusin', pause);
        carousel.addEventListener('focusout', (e) => { if (!carousel.contains(e.relatedTarget)) resume(); });
        track.addEventListener('touchstart', pause, { passive: true });
        document.addEventListener('visibilitychange', restart);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => {
                inView = entry.isIntersecting;
                restart();
            }, { threshold: 0.4 }).observe(carousel);
        }

        setActive(0);
    });

    // Long descriptions: collapse with a "Mehr anzeigen" toggle
    document.querySelectorAll('[data-collapsible]').forEach((box) => {
        const toggle = box.parentElement.querySelector('[data-collapsible-toggle]');
        if (!toggle || box.scrollHeight <= 320) {
            return;
        }
        box.classList.add('is-collapsed');
        toggle.classList.remove('hidden');
        toggle.addEventListener('click', () => {
            const collapsed = box.classList.toggle('is-collapsed');
            toggle.textContent = collapsed ? 'Mehr anzeigen' : 'Weniger anzeigen';
        });
    });

    // ---------------------------------------------------------------------
    // Modal
    // ---------------------------------------------------------------------
    const modal = document.getElementById('customModal');
    const iconSuccess = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    const iconError = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

    function showModal(title, message, isSuccess) {
        if (!modal) {
            return;
        }
        const modalIcon = document.getElementById('modalIcon');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        modalIcon.className = `modal-icon ${isSuccess ? 'success' : 'error'}`;
        modalIcon.innerHTML = isSuccess ? iconSuccess : iconError;
        modal.classList.add('active');
        document.getElementById('modalButton')?.focus();
    }

    function closeModal() {
        modal?.classList.remove('active');
    }

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    document.getElementById('modalButton')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            setMenu(false);
        }
    });

    // ---------------------------------------------------------------------
    // Contact form
    // ---------------------------------------------------------------------
    const contactForm = document.getElementById('contactForm');

    // The form shows a fixed +49 prefix; turn "0176 …", "176 …" or "0049 …" into "+49 176 …".
    function formatPhone(raw) {
        const value = raw.trim();
        if (!value) {
            return '';
        }
        if (value.startsWith('+')) {
            return value;
        }
        if (value.startsWith('00')) {
            return `+${value.slice(2)}`;
        }
        return `+49 ${value.replace(/^0+/, '')}`;
    }

    if (contactForm) {
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitLoading = document.getElementById('submitLoading');
        const privacyConsentField = document.getElementById('privacyConsent');

        // "Per WhatsApp senden": opens the visitor's WhatsApp with a lead message
        // that is clearly marked as coming from the website.
        document.getElementById('whatsappSendBtn')?.addEventListener('click', () => {
            const nameField = document.getElementById('name');
            const messageField = document.getElementById('message');
            for (const field of [nameField, messageField]) {
                if (!field.value.trim()) {
                    field.reportValidity();
                    field.focus();
                    return;
                }
            }

            const phone = formatPhone(document.getElementById('phone').value);
            const email = document.getElementById('email').value.trim();
            const lines = [
                '🌐 *Neue Anfrage über hf-autos.de*',
                '',
                `👤 *Name:* ${nameField.value.trim()}`,
                phone ? `📞 *Telefon:* ${phone}` : null,
                email ? `✉️ *E-Mail:* ${email}` : null,
                '',
                '💬 *Nachricht:*',
                messageField.value.trim(),
                '',
                '_Gesendet über das Kontaktformular auf hf-autos.de_'
            ].filter((line) => line !== null);

            const url = `https://wa.me/4917662878366?text=${encodeURIComponent(lines.join('\n'))}`;
            if (canTrackAnalytics()) {
                window.gtag('event', 'whatsapp_lead', { event_category: 'Contact', event_label: 'Contact Form WhatsApp' });
            }
            if (!window.open(url, '_blank', 'noopener')) {
                window.location.href = url;
            }
        });

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!privacyConsentField || !privacyConsentField.checked) {
                showModal('Datenschutz', 'Bitte bestätigen Sie die Datenschutzerklärung.', false);
                return;
            }

            submitBtn.disabled = true;
            submitText.classList.add('hidden');
            submitLoading.classList.remove('hidden');

            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                message: document.getElementById('message').value.trim(),
                privacyConsent: privacyConsentField.checked,
                website: document.getElementById('website').value.trim()
            };

            try {
                const response = await fetch('/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.success) {
                    if (canTrackAnalytics()) {
                        window.gtag('event', 'form_submission', {
                            event_category: 'Contact',
                            event_label: 'Contact Form',
                            value: 1
                        });
                        window.gtag('event', 'conversion', {
                            send_to: GA_MEASUREMENT_ID,
                            event_category: 'Contact',
                            event_label: 'Contact Form Submission'
                        });
                    }

                    showModal('Vielen Dank!', data.message, true);
                    contactForm.reset();
                } else {
                    showModal('Fehler', data.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.', false);
                }
            } catch (error) {
                console.error('Error:', error);
                showModal('Fehler', 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', false);
            } finally {
                submitBtn.disabled = false;
                submitText.classList.remove('hidden');
                submitLoading.classList.add('hidden');
            }
        });
    }
})();
