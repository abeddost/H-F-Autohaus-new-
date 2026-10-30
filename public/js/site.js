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
    } else {
        // Phones can block autoplay (iOS Low Power Mode, data saver) or leave videos
        // paused after switching apps. Muted videos may start on any user gesture, so
        // retry on taps/scrolls and when the page is shown again, until all are playing.
        const backgroundVideos = [...document.querySelectorAll('video[autoplay], video[data-lazy-video]')];
        const gestures = ['touchend', 'click', 'keydown', 'scroll'];
        const resumeVideos = () => {
            const ready = backgroundVideos.filter((video) => !video.querySelector('source[data-src]'));
            ready.forEach((video) => {
                if (video.paused) video.play().catch(() => {});
            });
            if (ready.length === backgroundVideos.length && ready.every((video) => !video.paused)) {
                gestures.forEach((type) => window.removeEventListener(type, resumeVideos));
            }
        };
        gestures.forEach((type) => window.addEventListener(type, resumeVideos, { passive: true }));
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) resumeVideos();
        });
        window.addEventListener('pageshow', resumeVideos);
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
    const AUTOPLAY_MS = 6000;

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
            // Desktop thumbnails and mobile dots both carry data-carousel-dot="<slide index>".
            dots.forEach((dot) => {
                const active = Number(dot.dataset.carouselDot) === index;
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
        dots.forEach((dot) => dot.addEventListener('click', () => goTo(Number(dot.dataset.carouselDot))));
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

    // Vehicle picker: turns the contact form's <select> into a searchable list with
    // photos. The select stays in the form, visually hidden, so it still carries the
    // value and the required-validation (the browser's hint appears over the picker).
    document.querySelectorAll('[data-vehicle-picker]').forEach((picker) => {
        const select = picker.querySelector('select');
        const listId = `${select.id}List`;
        const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const el = (tag, className, text) => {
            const node = document.createElement(tag);
            if (className) node.className = className;
            if (text) node.textContent = text;
            return node;
        };
        const icon = (className, paths) => {
            const span = el('span', className);
            span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
            return span;
        };

        const items = [...select.options].filter((option) => option.value).map((option) => {
            const isOther = option.value === 'other';
            const li = el('li', 'vpick-opt');
            li.id = `${listId}-${option.value}`;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', 'false');
            const text = el('span', 'vpick-text');
            if (isOther) {
                li.append(icon('vpick-media vpick-icon', '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'));
                text.append(el('span', 'vpick-name', 'Sonstiges – kein bestimmtes Fahrzeug'), el('span', 'vpick-hint', 'Auto verkaufen, Finanzierung oder allgemeine Fragen'));
                li.append(text);
            } else {
                const { make = '', name = option.textContent.trim(), price = '', image = '' } = option.dataset;
                if (image) {
                    const img = el('img', 'vpick-media');
                    img.src = image;
                    img.alt = '';
                    img.loading = 'lazy';
                    li.append(img);
                } else {
                    li.append(el('span', 'vpick-media'));
                }
                text.append(el('span', 'vpick-make', make), el('span', 'vpick-name', name));
                li.append(text);
                if (price) li.append(el('span', 'vpick-price', price));
            }
            return { option, li, isOther, search: normalize(`${option.dataset.make || ''} ${li.textContent}`) };
        });
        const cars = items.filter((item) => !item.isOther);

        const trigger = el('button', 'field vpick-trigger');
        trigger.type = 'button';
        trigger.id = `${select.id}Trigger`;
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        const triggerValue = el('span', 'vpick-value');
        trigger.append(triggerValue, icon('vpick-chevron', '<path d="m6 9 6 6 6-6"/>'));

        const panel = el('div', 'vpick-panel');
        panel.hidden = true;
        const searchWrap = icon('vpick-search', '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
        const search = el('input');
        search.type = 'search';
        search.placeholder = 'Marke oder Modell suchen …';
        search.autocomplete = 'off';
        search.setAttribute('role', 'combobox');
        search.setAttribute('aria-label', 'Fahrzeug suchen');
        search.setAttribute('aria-controls', listId);
        search.setAttribute('aria-expanded', 'true');
        search.setAttribute('aria-autocomplete', 'list');
        searchWrap.append(search);
        const list = el('ul', 'vpick-list');
        list.id = listId;
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', 'Fahrzeuge');
        const heading = el('li', 'vpick-heading', `Unser Bestand · ${cars.length} Fahrzeuge`);
        heading.setAttribute('role', 'presentation');
        const empty = el('li', 'vpick-empty', 'Kein passendes Fahrzeug gefunden.');
        empty.setAttribute('role', 'presentation');
        list.append(...items.filter((item) => item.isOther).map((item) => item.li));
        if (cars.length) list.append(heading, ...cars.map((item) => item.li), empty);
        panel.append(searchWrap, list);

        picker.classList.add('is-enhanced');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        picker.append(trigger, panel);
        const label = document.querySelector(`label[for="${select.id}"]`);
        if (label) label.htmlFor = trigger.id;

        let visible = items;
        let active = -1;

        function setActive(index) {
            visible.forEach((item) => item.li.classList.remove('is-active'));
            active = index;
            const item = visible[index];
            if (item) {
                item.li.classList.add('is-active');
                item.li.scrollIntoView({ block: 'nearest' });
                search.setAttribute('aria-activedescendant', item.li.id);
            } else {
                search.removeAttribute('aria-activedescendant');
            }
        }

        function filter() {
            const words = normalize(search.value).split(/\s+/).filter(Boolean);
            visible = items.filter((item) => {
                const match = item.isOther || words.every((word) => item.search.includes(word));
                item.li.hidden = !match;
                return match;
            });
            const carsShown = visible.some((item) => !item.isOther);
            empty.hidden = carsShown || !words.length;
            heading.hidden = !carsShown;
            // While searching, jump to the first matching car rather than "Sonstiges".
            setActive(words.length && carsShown ? 1 : 0);
        }

        function render() {
            const option = select.selectedOptions[0];
            const item = items.find((entry) => entry.option === option);
            items.forEach((entry) => entry.li.setAttribute('aria-selected', String(entry === item)));
            trigger.classList.toggle('has-value', Boolean(item));
            triggerValue.replaceChildren(...(item
                ? [...item.li.children].map((child) => child.cloneNode(true))
                : [el('span', 'vpick-placeholder', 'Fahrzeug auswählen …')]));
        }

        function open() {
            panel.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            search.value = '';
            filter();
            const selected = visible.findIndex((item) => item.option === select.selectedOptions[0]);
            if (selected > -1) setActive(selected);
            // On phones, don't pop up the keyboard until the visitor taps the search field.
            if (!coarsePointer) search.focus();
            panel.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }

        function close(returnFocus) {
            if (panel.hidden) return;
            panel.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
            if (returnFocus) trigger.focus();
        }

        function choose(item) {
            if (!item) return;
            select.value = item.option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            close(true);
        }

        trigger.addEventListener('click', () => (panel.hidden ? open() : close(false)));
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                open();
                search.focus();
            }
        });
        search.addEventListener('input', filter);
        search.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const step = e.key === 'ArrowDown' ? 1 : -1;
                setActive((active + step + visible.length) % visible.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                choose(visible[active]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                close(true);
            } else if (e.key === 'Tab') {
                close(false);
            }
        });
        list.addEventListener('click', (e) => choose(items.find((item) => item.li === e.target.closest('.vpick-opt'))));
        list.addEventListener('mousemove', (e) => {
            const index = visible.findIndex((item) => item.li === e.target.closest('.vpick-opt'));
            if (index > -1 && index !== active) setActive(index);
        });
        document.addEventListener('pointerdown', (e) => {
            if (!picker.contains(e.target)) close(false);
        });

        select.addEventListener('change', () => {
            picker.classList.remove('is-invalid');
            render();
        });
        select.addEventListener('invalid', () => picker.classList.add('is-invalid'));
        select.form?.addEventListener('reset', () => setTimeout(render));
        render();
    });

    // WhatsApp lines for the chosen car: make + name + price, and its page link.
    function vehicleLines(select) {
        const option = select?.selectedOptions[0];
        if (!option || !option.value) {
            return [];
        }
        const group = option.parentElement.tagName === 'OPTGROUP' ? `${option.parentElement.label} ` : '';
        return [
            `🚗 *Fahrzeug:* ${group}${option.textContent.trim()}`,
            option.dataset.url ? `🔗 ${option.dataset.url}` : null
        ];
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
            const vehicleField = document.getElementById('vehicle');
            const messageField = document.getElementById('message');
            for (const field of [nameField, vehicleField, messageField].filter(Boolean)) {
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
                ...vehicleLines(vehicleField),
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
                vehicleId: document.getElementById('vehicle')?.value || '',
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
