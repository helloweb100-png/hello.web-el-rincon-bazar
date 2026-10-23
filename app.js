/* ==========================================================================
   EL RINCÓN BAZAR · app.js
   1. Utilidades        5. Hero (mandala, polvo dorado, inclinación 3D)
   2. Menú y navegación 6. Secciones con scroll (GSAP + ScrollTrigger)
   3. Formulario WA     7. Cargador y arranque
   4. FAQ, video y galería

   Principios:
   - Sin listeners de "scroll" propios: todo el scroll va por Lenis +
     ScrollTrigger (el cálculo corre una sola vez por frame).
   - Mejora progresiva: si GSAP no carga o el usuario prefiere menos
     movimiento, la página es 100% funcional y legible sin animaciones.
   - Solo se animan transform, opacity y clip-path.
   ========================================================================== */
(() => {
    'use strict';

    /* ---------- CONFIG (editar aquí) ---------- */
    const CONFIG = {
        phone: '524425201442',   // WhatsApp con lada de país
    };

    /* ---------- 1. UTILIDADES ---------- */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = document.documentElement;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    const animated = hasGSAP && !reduceMotion;

    let lenis = null;
    let menuOpen = false;

    /** Envuelve cada palabra de un nodo (respetando <em>) en un <span>. */
    function wrapWords(el, { mask = false } = {}) {
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const outer = document.createElement('span');
                        if (mask) {
                            outer.className = 'split-word';
                            outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.16em;margin-bottom:-.16em;';
                            const inner = document.createElement('span');
                            inner.style.display = 'inline-block';
                            inner.textContent = part;
                            outer.appendChild(inner);
                        } else {
                            outer.className = 'w';
                            outer.textContent = part;
                        }
                        frag.appendChild(outer);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1) {
                    walk(child);
                }
            });
        };
        walk(el);
        return mask ? $$('.split-word > span', el) : $$('.w', el);
    }

    /** Posición de scroll de un destino (considera secciones ancladas). */
    function targetY(el) {
        if (hasGSAP) {
            const st = ScrollTrigger.getAll().find((s) => s.trigger === el && s.pin);
            if (st) return st.start;
        }
        return el.getBoundingClientRect().top + window.scrollY;
    }

    function scrollToEl(el) {
        // Las secciones ancladas (pin) se alcanzan justo en su punto de inicio; el resto, bajo el nav
        const pinned = hasGSAP && ScrollTrigger.getAll().some((s) => s.trigger === el && s.pin);
        const offset = el.id === 'inicio' || pinned ? 0 : -(parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 70) + 1;
        if (lenis) {
            lenis.scrollTo(targetY(el) + offset, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
        } else {
            window.scrollTo({ top: targetY(el) + offset, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
    }

    /* ---------- 2. MENÚ Y NAVEGACIÓN ---------- */
    function initMenu() {
        const burger = $('#burger');
        const menu = $('#menu');
        if (!burger || !menu) return;

        const setMenu = (open) => {
            menuOpen = open;
            root.classList.toggle('menu-open', open);
            if (open) $('#nav')?.classList.remove('is-hidden');
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', String(!open));
            if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            root.style.overflow = open ? 'hidden' : '';
            if (lenis) open ? lenis.stop() : lenis.start();
            if (open) $('a', menu)?.focus({ preventScroll: true });
        };

        burger.addEventListener('click', () => setMenu(!menuOpen));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); }
        });
        $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });

        // Enlaces ancla con scroll suave (Lenis o nativo)
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            const target = document.getElementById(id.slice(1));
            if (!target) return;
            e.preventDefault();
            scrollToEl(target);
            history.replaceState(null, '', id);
        });
    }

    /* ---------- 3. FORMULARIO → WHATSAPP ---------- */
    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const btn = $('#f-submit');
        const status = $('#f-status');
        const f = {
            name: $('#f-name'), phone: $('#f-phone'), intent: $('#f-intent'), msg: $('#f-msg'),
        };

        const setError = (input, text) => {
            const field = input.closest('.field');
            const out = $(`#${input.id}-err`);
            field.classList.toggle('has-error', Boolean(text));
            input.setAttribute('aria-invalid', text ? 'true' : 'false');
            if (out) out.textContent = text || '';
            return !text;
        };

        const validators = {
            name: () => setError(f.name, f.name.value.trim().length >= 2 ? '' : 'Escribe tu nombre para saber cómo llamarte.'),
            phone: () => {
                const digits = f.phone.value.replace(/\D/g, '');
                return setError(f.phone, !f.phone.value.trim() || (digits.length >= 8 && digits.length <= 15) ? '' : 'Revisa tu teléfono: debe tener entre 8 y 15 dígitos.');
            },
            intent: () => setError(f.intent, f.intent.value ? '' : 'Elige una opción para ayudarte mejor.'),
        };
        Object.entries(validators).forEach(([key, fn]) => {
            f[key].addEventListener('blur', fn);
            f[key].addEventListener('input', () => { if (f[key].closest('.field').classList.contains('has-error')) fn(); });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const ok = [validators.name(), validators.phone(), validators.intent()].every(Boolean);
            status.classList.remove('is-ok');
            if (!ok) {
                status.textContent = 'Revisa los campos marcados para continuar.';
                form.querySelector('.has-error input, .has-error select')?.focus();
                return;
            }

            const lines = [`Hola, soy ${f.name.value.trim()}. ${f.intent.value}`];
            if (f.msg.value.trim()) lines.push(f.msg.value.trim());
            if (f.phone.value.trim()) lines.push(`Mi teléfono: ${f.phone.value.trim()}`);
            const url = `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(lines.join('\n'))}`;

            btn.classList.add('is-loading');
            btn.disabled = true;
            status.textContent = 'Preparando tu mensaje...';

            setTimeout(() => {
                const win = window.open(url, '_blank');
                if (win) win.opener = null; else window.location.assign(url);
                btn.classList.remove('is-loading');
                btn.disabled = false;
                status.classList.add('is-ok');
                status.innerHTML = '';
                status.append('Listo, abrimos WhatsApp con tu mensaje. ');
                const link = document.createElement('a');
                link.href = url; link.target = '_blank'; link.rel = 'noopener';
                link.textContent = 'Si no se abrió, toca aquí.';
                link.style.textDecoration = 'underline';
                status.append(link);
                form.reset();
            }, reduceMotion ? 0 : 900);
        });
    }

    /* ---------- 4. FAQ Y VIDEO ---------- */
    function initFaq() {
        const items = $$('.faq-item');
        items.forEach((item) => {
            const q = $('.faq-q', item);
            q.addEventListener('click', () => {
                const willOpen = !item.classList.contains('is-open');
                items.forEach((i) => {
                    i.classList.remove('is-open');
                    $('.faq-q', i).setAttribute('aria-expanded', 'false');
                });
                if (willOpen) {
                    item.classList.add('is-open');
                    q.setAttribute('aria-expanded', 'true');
                }
                if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 700);
            });
        });
    }

    function initReel() {
        const video = $('#reel');
        const toggle = $('#reel-toggle');
        if (!video || !toggle) return;
        const icon = $('i', toggle);
        let userPaused = reduceMotion;

        const paint = (playing) => {
            icon.className = playing ? 'ph-fill ph-pause' : 'ph-fill ph-play';
            toggle.setAttribute('aria-label', playing ? 'Pausar video' : 'Reproducir video');
        };
        paint(!userPaused);

        // Solo reproduce cuando está a la vista (ahorra batería y datos)
        new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !userPaused) {
                video.preload = 'auto';
                video.play().then(() => paint(true)).catch(() => paint(false));
            } else {
                video.pause();
            }
        }, { threshold: 0.35 }).observe(video);

        toggle.addEventListener('click', () => {
            userPaused = !userPaused;
            if (userPaused) { video.pause(); paint(false); }
            else { video.play().then(() => paint(true)).catch(() => paint(false)); }
        });
    }

    /** Galería: filtros por categoría, "Ver más", mosaico estable y visor de fotos (<dialog>). */
    function initGallery() {
        const grid = $('#g-grid');
        const box = $('#lightbox');
        if (!grid || !box) return;

        const items = $$('.g-item', grid);
        const chips = $$('.g-chip');
        const moreBtn = $('#g-more');
        const count = $('#g-count');
        const LIMIT = 13;                       // fotos visibles antes de "Ver más" (con la panorámica, cierra parejo en 2, 3 y 4 columnas)
        let filter = 'all';
        let expanded = false;
        let lastWidth = 0;
        let stTimer;

        const refreshSoon = () => {             // el alto de la página cambia: reubica los ScrollTrigger de abajo
            if (!animated) return;
            clearTimeout(stTimer);
            stTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
        };
        const matching = () => items.filter((el) => filter === 'all' || el.dataset.cat === filter);

        /* Mosaico: cada foto ocupa tantas filas de 1px como mida (alto + separación) */
        const layout = () => {
            const gap = parseFloat(getComputedStyle(grid).getPropertyValue('--g')) || 0;
            items
                .filter((el) => !el.hidden)
                .map((el) => [el, el.firstElementChild.getBoundingClientRect().height])
                .forEach(([el, h]) => { el.style.gridRowEnd = `span ${Math.max(1, Math.ceil(h + gap))}`; });
        };

        /** Muestra las fotos del filtro activo (hasta LIMIT) y devuelve las que acaban de aparecer. */
        const apply = (animate) => {
            const list = matching();
            const shown = new Set(expanded ? list : list.slice(0, LIMIT));
            const entering = [];
            items.forEach((el) => {
                const show = shown.has(el);
                if (el.hidden === show) { el.hidden = !show; if (show) entering.push(el); }
            });
            layout();

            if (animate) {
                entering.forEach((el, i) => {
                    el.classList.remove('g-enter');
                    el.classList.add('is-in');
                    el.style.setProperty('--d', `${Math.min(i, 11) * 45}ms`);
                });
                void grid.offsetWidth;          // reinicia la animación aunque la foto ya la hubiera usado
                entering.forEach((el) => el.classList.add('g-enter'));
            }

            count.textContent = shown.size < list.length ? `Mostrando ${shown.size} de ${list.length} fotos` : `Mostrando las ${list.length} fotos`;
            moreBtn.hidden = shown.size >= list.length;
            refreshSoon();
            return entering;
        };

        grid.classList.add('is-masonry');
        apply(false);

        if ('ResizeObserver' in window) {       // cambia el nº de columnas o el ancho: recalcula alturas
            new ResizeObserver(([entry]) => {
                const w = Math.round(entry.contentRect.width);
                if (w === lastWidth) return;
                const first = lastWidth === 0;
                lastWidth = w;
                layout();
                if (!first) refreshSoon();
            }).observe(grid);
        }

        // Entrada escalonada al llegar a la vista (con "reducir movimiento" no se anima nada)
        if (animated && 'IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.filter((e) => e.isIntersecting).forEach((e, i) => {
                    e.target.style.transitionDelay = `${i * 70}ms`;
                    e.target.classList.add('is-in');
                    io.unobserve(e.target);
                });
            }, { rootMargin: '0px 0px -8% 0px' });
            items.forEach((el) => io.observe(el));
        } else {
            items.forEach((el) => el.classList.add('is-in'));
        }

        chips.forEach((chip) => chip.addEventListener('click', () => {
            if (chip.dataset.filter === filter) return;
            filter = chip.dataset.filter;
            expanded = false;
            chips.forEach((c) => {
                c.classList.toggle('is-active', c === chip);
                c.setAttribute('aria-pressed', String(c === chip));
            });
            apply(true);
        }));

        moreBtn.addEventListener('click', () => {
            expanded = true;
            const fresh = apply(true);
            if (fresh[0]) fresh[0].firstElementChild.focus({ preventScroll: true });   // el botón desaparece: el foco pasa a la primera foto nueva
        });

        /* ----- Visor ----- */
        const lbImg = $('#lb-img');
        const lbCap = $('#lb-cap');
        const lbI = $('#lb-i');
        const lbN = $('#lb-n');
        let seq = [];                           // todas las fotos del filtro activo (no solo las visibles)
        let pos = 0;
        let token = 0;

        const fullOf = (el) => el.firstElementChild.href;
        const preload = (el) => { new Image().src = fullOf(el); };

        const show = (i) => {
            pos = (i + seq.length) % seq.length;
            const el = seq[pos];
            const thumb = $('img', el);
            const mine = ++token;
            lbI.textContent = String(pos + 1);
            lbN.textContent = String(seq.length);
            lbCap.textContent = thumb.alt;
            lbImg.alt = thumb.alt;
            lbImg.src = thumb.currentSrc || thumb.src;          // la miniatura aparece al instante...
            const big = new Image();
            big.src = fullOf(el);
            const paint = () => { if (mine === token && lbImg.src !== big.src) lbImg.src = big.src; };   // ...y se afina al cargar la grande
            if (big.decode) big.decode().then(paint, paint); else big.onload = paint;
            if (seq.length > 1) { preload(seq[(pos + 1) % seq.length]); preload(seq[(pos - 1 + seq.length) % seq.length]); }
        };

        grid.addEventListener('click', (e) => {
            const link = e.target.closest('.g-link');
            if (!link || typeof box.showModal !== 'function') return;     // sin <dialog>: el enlace abre la foto sola
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            seq = matching();
            box.showModal();
            root.style.overflow = 'hidden';
            root.classList.add('lb-open');
            if (lenis) lenis.stop();
            show(Math.max(0, seq.indexOf(link.parentElement)));
        });

        box.addEventListener('close', () => {
            root.style.overflow = '';
            root.classList.remove('lb-open');
            if (lenis) lenis.start();
            token++;
            lbImg.removeAttribute('src');
        });
        $('#lb-close').addEventListener('click', () => box.close());
        $('#lb-prev').addEventListener('click', () => show(pos - 1));
        $('#lb-next').addEventListener('click', () => show(pos + 1));
        box.addEventListener('click', (e) => {                              // clic en el fondo cierra
            if (!e.target.closest('#lb-img, #lb-cap, .lb-btn, .lb-count')) box.close();
        });
        box.addEventListener('keydown', (e) => {
            const go = { ArrowRight: () => show(pos + 1), ArrowLeft: () => show(pos - 1), Home: () => show(0), End: () => show(seq.length - 1) }[e.key];
            if (go) { e.preventDefault(); go(); }
        });

        // Deslizar con el dedo para cambiar de foto
        const stage = $('.lb-stage', box);
        let sx = 0, sy = 0, swiping = false;
        stage.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; swiping = true; });
        stage.addEventListener('pointercancel', () => { swiping = false; });
        stage.addEventListener('pointerup', (e) => {
            if (!swiping) return;
            swiping = false;
            const dx = e.clientX - sx;
            const dy = e.clientY - sy;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) show(pos + (dx < 0 ? 1 : -1));
        });
    }

    /* ---------- 5. HERO ---------- */
    /** Mandala geométrico generado por código (octagramas y pétalos).
     *  Cada capa es un <svg> independiente: rotarlo es solo un cambio de transform (compuesto en GPU). */
    function buildMandala() {
        const host = $('[data-mandala]');
        if (!host) return;
        const NS = 'http://www.w3.org/2000/svg';
        const C = 300;

        const layer = (cls) => {
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 600 600');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '1.1');
            svg.setAttribute('aria-hidden', 'true');
            if (cls) svg.setAttribute('class', cls);
            host.appendChild(svg);
            return svg;
        };
        const make = (parent, tag, attrs) => {
            const n = document.createElementNS(NS, tag);
            Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
            n.setAttribute('vector-effect', 'non-scaling-stroke');
            parent.appendChild(n);
        };
        const octagram = (parent, R, rot) => {
            [Math.PI / 4, 0].forEach((off) => {
                const pts = [0, 1, 2, 3].map((i) => {
                    const a = (Math.PI / 2) * i + off + rot;
                    return `${(C + R * Math.cos(a)).toFixed(2)},${(C + R * Math.sin(a)).toFixed(2)}`;
                }).join(' ');
                make(parent, 'polygon', { points: pts });
            });
        };

        const base = layer('');
        make(base, 'circle', { cx: C, cy: C, r: 292 });
        make(base, 'circle', { cx: C, cy: C, r: 278, 'stroke-dasharray': '2 9' });
        make(base, 'circle', { cx: C, cy: C, r: 226, 'stroke-opacity': '.7' });

        const a = layer('m-a');
        octagram(a, 262, 0);
        for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4) * i;
            make(a, 'circle', { cx: (C + 262 * Math.cos(ang)).toFixed(2), cy: (C + 262 * Math.sin(ang)).toFixed(2), r: 5, fill: 'currentColor' });
        }

        const b = layer('m-b');
        octagram(b, 212, Math.PI / 8);
        make(b, 'circle', { cx: C, cy: C, r: 150, 'stroke-opacity': '.8' });

        const c = layer('m-c');
        for (let i = 0; i < 16; i++) {
            make(c, 'ellipse', { cx: C, cy: C - 118, rx: 20, ry: 56, transform: `rotate(${i * 22.5} ${C} ${C})`, 'stroke-opacity': '.75' });
        }
    }

    /** Polvo dorado: partículas con parpadeo, chispas de 4 puntas y paralaje con el cursor. */
    function initDust() {
        const canvas = $('.hero-dust');
        const hero = $('.hero');
        if (!canvas || !hero) return null;
        const ctx = canvas.getContext('2d');
        const colors = ['#e8bb4d', '#dda82e', '#bd8a1c', '#f0d17f'];
        const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        let w = 0, h = 0, parts = [], raf = 0, visible = true;

        const size = () => {
            const r = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = r.width; h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        const spawn = (initial) => ({
            x: Math.random() * w,
            y: initial ? Math.random() * h : h + 20,
            r: 0.6 + Math.random() * 2.1,
            vy: 0.12 + Math.random() * 0.42,
            vx: (Math.random() - 0.5) * 0.22,
            ph: Math.random() * Math.PI * 2,
            tw: 0.6 + Math.random() * 1.5,
            z: 0.3 + Math.random() * 0.9,
            c: colors[(Math.random() * colors.length) | 0],
            spark: Math.random() < 0.2,
        });
        const build = () => {
            size();
            const count = w < 768 ? 34 : 72;
            parts = Array.from({ length: count }, () => spawn(true));
        };
        const star = (x, y, r) => {
            ctx.beginPath();
            ctx.moveTo(x, y - r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.quadraticCurveTo(x, y, x, y + r);
            ctx.quadraticCurveTo(x, y, x - r, y);
            ctx.quadraticCurveTo(x, y, x, y - r);
            ctx.fill();
        };
        const frame = (t, still) => {
            ctx.clearRect(0, 0, w, h);
            mouse.x = lerp(mouse.x, mouse.tx, 0.05);
            mouse.y = lerp(mouse.y, mouse.ty, 0.05);
            for (const p of parts) {
                if (!still) {
                    p.y -= p.vy;
                    p.x += p.vx + Math.sin(t / 1800 + p.ph) * 0.14;
                    if (p.y < -24) Object.assign(p, spawn(false));
                }
                const tw = 0.5 + 0.5 * Math.sin((t / 1000) * p.tw + p.ph);
                ctx.globalAlpha = 0.28 + 0.62 * tw;
                ctx.fillStyle = p.c;
                const px = p.x + mouse.x * 22 * p.z;
                const py = p.y + mouse.y * 14 * p.z;
                if (p.spark) star(px, py, p.r * 3.4);
                else { ctx.beginPath(); ctx.arc(px, py, p.r, 0, 6.2832); ctx.fill(); }
            }
        };
        const loop = (t) => {
            if (visible && !document.hidden) frame(t, false);
            raf = requestAnimationFrame(loop);
        };

        build();
        if (reduceMotion) { frame(0, true); window.addEventListener('resize', () => { build(); frame(0, true); }); return null; }

        new IntersectionObserver(([e]) => { visible = e.isIntersecting; hero.classList.toggle('is-paused', !visible); }, { threshold: 0 }).observe(hero);
        let rt;
        window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
        raf = requestAnimationFrame(loop);
        return mouse;
    }

    /** Inclinación 3D del logotipo y paralaje de capas con el cursor. */
    function initTilt(mouse) {
        if (!animated || !canHover) return;
        const hero = $('.hero');
        const emblem = $('[data-emblem]');
        if (!hero || !emblem) return;
        const mandala = $('.mandala');
        const a = $('.float-photo--a');
        const b = $('.float-photo--b');
        const opts = { duration: 0.9, ease: 'power3.out' };
        const rx = gsap.quickTo(emblem, 'rotationX', opts);
        const ry = gsap.quickTo(emblem, 'rotationY', opts);
        const ax = gsap.quickTo(a, 'x', opts), ay = gsap.quickTo(a, 'y', opts);
        const bx = gsap.quickTo(b, 'x', opts), by = gsap.quickTo(b, 'y', opts);
        const mx = gsap.quickTo(mandala, 'x', { duration: 1.4, ease: 'power3.out' });
        const my = gsap.quickTo(mandala, 'y', { duration: 1.4, ease: 'power3.out' });

        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            ry(nx * 18); rx(-ny * 14);
            ax(nx * -46); ay(ny * -30);
            bx(nx * 38); by(ny * 26);
            mx(nx * -26); my(ny * -18);
            if (mouse) { mouse.tx = nx; mouse.ty = ny; }
        });
        hero.addEventListener('pointerleave', () => {
            [rx, ry, ax, ay, bx, by, mx, my].forEach((fn) => fn(0));
            if (mouse) { mouse.tx = 0; mouse.ty = 0; }
        });
    }

    /** Entrada cinematográfica del hero (se dispara al abrirse el cargador). */
    function heroIntro() {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.to('.nav', { yPercent: 0, duration: 1.2 }, 0)
          .to('[data-hero="ribbon"]', { opacity: 1, x: 0, duration: 1.2 }, 0.15)
          .to('[data-hero="line"]', { yPercent: 0, duration: 1.4, stagger: 0.14 }, 0.25)
          .to('[data-hero="sub"]', { opacity: 1, y: 0, duration: 1.2 }, 0.7)
          .to('[data-hero="cta"] > *', { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.85)
          .to('.halo', { opacity: 1, duration: 2 }, 0)
          .to('.mandala', { opacity: 0.75, scale: 1, rotation: 0, duration: 2.4 }, 0)
          .to('.emblem', { opacity: 1, scale: 1, duration: 1.9 }, 0.1)
          .to('.float-photo', { opacity: 1, y: 0, scale: 1, duration: 1.6, stagger: 0.18 }, 0.5);
        return tl;
    }

    function heroPrepare() {
        gsap.set('.nav', { yPercent: -100 });
        gsap.set('[data-hero="ribbon"]', { opacity: 0, x: -40 });
        gsap.set('[data-hero="line"]', { yPercent: 118 });
        gsap.set('[data-hero="sub"]', { opacity: 0, y: 30 });
        gsap.set('[data-hero="cta"] > *', { opacity: 0, y: 30 });
        gsap.set('.halo', { opacity: 0 });
        gsap.set('.mandala', { opacity: 0, scale: 0.6, rotation: -30 });
        gsap.set('.emblem', { opacity: 0, scale: 0.82 });
        gsap.set('.float-photo', { opacity: 0, y: 90, scale: 0.9 });
    }

    /* ---------- 6. SECCIONES CON SCROLL ---------- */
    function initScroll() {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        if (typeof window.Lenis !== 'undefined') {
            lenis = new Lenis({
                duration: 1.25,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                wheelMultiplier: 0.9,
            });
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
            lenis.stop();                       // se libera al terminar el cargador
        }
    }

    function initChrome() {
        const nav = $('#nav');
        const bar = $('.nav-progress span');

        // Barra de progreso de lectura
        gsap.to(bar, {
            scaleX: 1, ease: 'none',
            scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.25 },
        });

        // Navegación: vidrio al bajar, se esconde al leer y reaparece al subir
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                const y = self.scroll();
                nav.classList.toggle('is-scrolled', y > 40);
                if (menuOpen) return;
                if (y > 480 && self.direction === 1) nav.classList.add('is-hidden');
                else if (self.direction === -1 || y <= 480) nav.classList.remove('is-hidden');
            },
        });

        // WhatsApp flotante: aparece al salir del hero
        const wa = $('#wa-float');
        let tipShown = false;
        ScrollTrigger.create({
            trigger: '.hero', start: 'bottom 85%',
            onEnter: () => {
                wa.classList.add('is-visible');
                if (!tipShown) {
                    tipShown = true;
                    setTimeout(() => wa.classList.add('show-tip'), 2500);
                    setTimeout(() => wa.classList.remove('show-tip'), 8500);
                }
            },
            onLeaveBack: () => wa.classList.remove('is-visible', 'show-tip'),
        });

        // La marquesina se acelera con la velocidad del scroll (feedback de movimiento)
        const track = $('.marquee-track');
        const anim = track && track.getAnimations ? track.getAnimations()[0] : null;
        if (anim) {
            const rate = { v: 1 };
            ScrollTrigger.create({
                trigger: '.marquee', start: 'top bottom', end: 'bottom top',
                onUpdate: (self) => {
                    const target = 1 + clamp(Math.abs(self.getVelocity()) / 500, 0, 6);
                    gsap.to(rate, { v: target, duration: 0.3, overwrite: true, onUpdate: () => { anim.playbackRate = rate.v; } });
                    gsap.to(rate, { v: 1, duration: 1.6, delay: 0.3, ease: 'power2.out', overwrite: 'auto', onUpdate: () => { anim.playbackRate = rate.v; } });
                },
            });
        }
    }

    function initHeroScroll() {
        const tl = gsap.timeline({
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
        });
        tl.to('.hero-copy', { yPercent: -14, opacity: 0.15, ease: 'none' }, 0)
          .to('.hero-stage', { yPercent: 10, ease: 'none' }, 0)
          .to('.hero-lattice', { yPercent: 14, ease: 'none' }, 0);
    }

    function initReveals() {
        // Titulares: cada palabra sube desde una máscara
        $$('[data-split]').forEach((el) => {
            const words = wrapWords(el, { mask: true });
            gsap.set(words, { yPercent: 118 });
            ScrollTrigger.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.06 }),
            });
        });

        // Elementos que entran con un fundido ascendente escalonado
        const fade = [
            '.section-head p', '.process-lead', '.reel', '.visit-info .eyebrow', '.visit-row', '.map',
            '.g-filters', '.g-more', '.g-cta', '.visit-note', '.visit-info > .btn', '.form-card', '.faq-item', '.finale-inner > :not(h2)',
            '.footer-brand', '.footer-col', '.footer-bottom', '.manifesto .orn', '.stats li',
        ].join(',');
        const items = $$(fade);
        gsap.set(items, { opacity: 0, y: 44 });
        ScrollTrigger.batch(items, {
            start: 'top 90%', once: true,
            onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, overwrite: true }),
        });

        // Manifiesto: las palabras se "encienden" con el scroll
        const text = $('.manifesto-text');
        if (text) {
            const words = wrapWords(text);
            // Estado "apagado": 50% (azul) y 80% (dorado) para mantener contraste AA de texto grande
            gsap.fromTo(words, { opacity: (i, el) => (el.closest('em') ? 0.8 : 0.5) }, {
                opacity: 1, ease: 'none', stagger: 0.12,
                scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 42%', scrub: 0.6 },
            });
        }

        // Contadores
        $$('[data-count]').forEach((el) => {
            const to = Number(el.dataset.count);
            const from = el.dataset.from !== undefined ? Number(el.dataset.from) : 0;
            const o = { v: from };
            el.textContent = from;
            ScrollTrigger.create({
                trigger: el, start: 'top 90%', once: true,
                onEnter: () => gsap.to(o, { v: to, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }),
            });
        });
    }

    /** Portal: una ventana en arco se abre hasta ocupar toda la pantalla. */
    function initPortal() {
        const section = $('.portal');
        if (!section) return;
        const media = $('.portal-media');
        const img = $('.portal-img');
        const shade = $('.portal-shade');
        const wl = $('.portal-word--l');
        const wr = $('.portal-word--r');
        const cap = $('.portal-caption');

        const mm = gsap.matchMedia();
        mm.add({ desktop: '(min-width: 1024px)', tablet: '(min-width: 768px) and (max-width: 1023px)', mobile: '(max-width: 767px)' }, (ctx) => {
            const { desktop, tablet, mobile } = ctx.conditions;
            const from = desktop ? { t: 12, r: 36, b: 12, l: 36 } : tablet ? { t: 10, r: 33, b: 10, l: 33 } : { t: 22, r: 14, b: 22, l: 14 };
            let half = 0;
            const measure = () => { half = (window.innerWidth * (100 - from.l - from.r)) / 100 / 2; };
            measure();
            ScrollTrigger.addEventListener('refreshInit', measure);

            const o = { p: 0 };
            const apply = () => {
                const p = o.p;
                const rad = half * (1 - Math.pow(p, 0.8));
                media.style.clipPath = `inset(${from.t * (1 - p)}% ${from.r * (1 - p)}% ${from.b * (1 - p)}% ${from.l * (1 - p)}% round ${rad}px ${rad}px 0 0)`;
                img.style.transform = `scale(${1.25 - 0.25 * p})`;
                shade.style.opacity = String(clamp((p - 0.5) / 0.4, 0, 1));
            };
            apply();

            const tl = gsap.timeline({
                scrollTrigger: { trigger: section, start: 'top top', end: '+=170%', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true },
            });
            tl.to(o, { p: 1, ease: 'none', duration: 1, onUpdate: apply }, 0)
              // Las palabras salen antes de que la ventana les llegue (primer 38% del recorrido)
              .to(wl, mobile ? { yPercent: -260, opacity: 0, ease: 'power2.in', duration: 0.38 } : { xPercent: -170, opacity: 0, ease: 'power2.in', duration: 0.38 }, 0)
              .to(wr, mobile ? { yPercent: 260, opacity: 0, ease: 'power2.in', duration: 0.38 } : { xPercent: 170, opacity: 0, ease: 'power2.in', duration: 0.38 }, 0)
              .fromTo(cap, { opacity: 0, y: 50 }, { opacity: 1, y: 0, ease: 'power3.out', duration: 0.38 }, 0.62);

            return () => {
                ScrollTrigger.removeEventListener('refreshInit', measure);
                media.style.clipPath = ''; img.style.transform = ''; shade.style.opacity = '';
            };
        });
    }

    function initPaths() {
        $$('.path').forEach((panel, i) => {
            const body = $('.path-body', panel);
            const photo = $('.path-photo', panel);
            const img = $('img', photo);
            const kids = $$(':scope > :not(h2)', body);

            gsap.set(kids, { opacity: 0, y: 40 });
            ScrollTrigger.create({
                trigger: panel, start: 'top 65%', once: true,
                onEnter: () => gsap.to(kids, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1 }),
            });
            gsap.from(photo, {
                yPercent: 16, opacity: 0, duration: 1.6, ease: 'expo.out',
                scrollTrigger: { trigger: panel, start: 'top 60%', once: true },
            });
            gsap.fromTo(img, { yPercent: -9, scale: 1.2 }, {
                yPercent: 9, scale: 1.2, ease: 'none',
                scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true },
            });
        });
    }

    /** Qué recibimos: en escritorio el scroll vertical se convierte en recorrido horizontal. */
    function initCats() {
        const section = $('.cats');
        if (!section) return;
        const mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', () => {
            const track = $('.cats-track');
            const bar = $('.cats-progress span');
            const dist = () => {
                const last = track.lastElementChild;
                const gut = parseFloat(getComputedStyle(track).paddingLeft) || 0;
                return Math.max(0, last.offsetLeft + last.offsetWidth + gut - window.innerWidth);
            };
            const tween = gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    trigger: section, start: 'top top', end: () => `+=${dist()}`,
                    pin: '.cats-pin', scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
                    onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; },
                },
            });
            $$('.cat').forEach((card) => {
                const img = $('img', card);
                gsap.fromTo(img, { xPercent: -9, scale: 1.2 }, {
                    xPercent: 9, scale: 1.2, ease: 'none',
                    scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
                });
            });
            return () => { bar.style.transform = ''; };
        });
    }

    /** Pasos de consignación: la línea dorada se dibuja y cada paso se enciende. */
    function initProcess() {
        const list = $('.steps');
        if (!list) return;
        const steps = $$('.step:not(.step--done)', list);
        const rail = document.createElement('span');
        const fill = document.createElement('span');
        rail.className = 'steps-rail'; fill.className = 'steps-fill';
        rail.setAttribute('aria-hidden', 'true'); fill.setAttribute('aria-hidden', 'true');
        list.prepend(rail, fill);

        const place = () => {
            const lr = list.getBoundingClientRect();
            const a = $('.step-icon', steps[0]).getBoundingClientRect();
            const b = $('.step-icon', steps[steps.length - 1]).getBoundingClientRect();
            const top = a.top + a.height / 2 - lr.top;
            const h = b.top + b.height / 2 - (a.top + a.height / 2);
            [rail, fill].forEach((el) => { el.style.top = `${top}px`; el.style.height = `${h}px`; el.style.bottom = 'auto'; });
        };
        place();
        ScrollTrigger.addEventListener('refresh', place);

        gsap.fromTo(fill, { scaleY: 0 }, {
            scaleY: 1, ease: 'none',
            scrollTrigger: { trigger: steps[0], endTrigger: steps[steps.length - 1], start: 'center 58%', end: 'center 58%', scrub: 0.4 },
        });
        steps.forEach((step) => {
            ScrollTrigger.create({
                trigger: step, start: 'top 62%',
                onEnter: () => step.classList.add('is-active'),
                onLeaveBack: () => step.classList.remove('is-active'),
            });
        });
        const done = $('.done-card');
        if (done) {
            gsap.from(done, {
                y: 70, opacity: 0, scale: 0.96, duration: 1.3, ease: 'expo.out',
                scrollTrigger: { trigger: done, start: 'top 88%', once: true },
            });
        }
    }

    function initBento() {
        const cells = $$('.bento-cell');
        gsap.set(cells, { opacity: 0, y: 80, scale: 0.96 });
        ScrollTrigger.create({
            trigger: '.bento', start: 'top 82%', once: true,
            onEnter: () => gsap.to(cells, { opacity: 1, y: 0, scale: 1, duration: 1.4, ease: 'expo.out', stagger: 0.12 }),
        });
        // Foco de luz que sigue al cursor
        $$('[data-spot]').forEach((cell) => {
            cell.addEventListener('pointermove', (e) => {
                const r = cell.getBoundingClientRect();
                cell.style.setProperty('--mx', `${e.clientX - r.left}px`);
                cell.style.setProperty('--my', `${e.clientY - r.top}px`);
            });
        });
    }

    function initFinale() {
        gsap.fromTo('.finale-media img', { yPercent: -8, scale: 1.12 }, {
            yPercent: 8, scale: 1.12, ease: 'none',
            scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom top', scrub: true },
        });
    }

    /** Botones "magnéticos": se acercan suavemente al cursor. */
    function initMagnetic() {
        if (!canHover) return;
        $$('[data-magnetic]').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
                yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }

    /* ---------- 7. CARGADOR Y ARRANQUE ---------- */
    async function runLoader(initReady = Promise.resolve()) {
        const loader = $('#loader');
        if (!loader) { heroIntro(); return; }
        const num = $('#ld-num');
        const meter = $('.ld-meter-fill', loader);
        const minMs = 2000;
        const state = { p: 0 };
        const render = () => {
            num.textContent = String(Math.round(state.p));
            meter.style.transform = `scaleX(${state.p / 100})`;
        };

        const loaded = document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise((res) => window.addEventListener('load', res, { once: true }));
        const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait(2500)]) : Promise.resolve();
        const ready = Promise.all([loaded, fonts, wait(minMs), initReady]);

        const crawl = gsap.to(state, { p: 92, duration: minMs / 1000, ease: 'power2.out', onUpdate: render });
        await ready;
        crawl.kill();
        await gsap.to(state, { p: 100, duration: 0.55, ease: 'power2.inOut', onUpdate: render });
        await wait(120);

        const tl = gsap.timeline({
            onComplete: () => {
                loader.remove();
                root.classList.remove('is-loading');
                if (lenis) lenis.start();
                ScrollTrigger.refresh();
            },
        });
        tl.to('.ld-core', { scale: 1.14, opacity: 0, duration: 0.7, ease: 'power3.in' })
          .to('.ld-curtain--l', { xPercent: -101, duration: 1.3, ease: 'expo.inOut' }, '-=0.1')
          .to('.ld-curtain--r', { xPercent: 101, duration: 1.3, ease: 'expo.inOut' }, '<')
          .add(heroIntro, '-=0.95');
    }

    function removeLoaderNow() {
        const loader = $('#loader');
        if (loader) loader.remove();
        root.classList.remove('is-loading');
    }

    /** Cede el hilo principal para que el navegador pinte/responda entre bloques de trabajo. */
    const yieldToMain = () => new Promise((resolve) => {
        if (window.scheduler && typeof window.scheduler.yield === 'function') window.scheduler.yield().then(resolve);
        else setTimeout(resolve, 0);
    });

    async function boot() {
        initMenu();
        initForm();
        initFaq();
        initReel();
        initGallery();
        buildMandala();
        const mouse = initDust();

        if (!animated) {
            // Sin GSAP o con "reducir movimiento": experiencia completa, sin coreografía
            removeLoaderNow();
            return;
        }

        root.classList.add('js', 'is-loading');
        heroPrepare();
        initScroll();

        // El cargador arranca ya; la coreografía se prepara por tramos mientras gira el spinner
        let finishInit;
        const initReady = new Promise((resolve) => { finishInit = resolve; });
        runLoader(initReady);

        await yieldToMain();
        initChrome();
        initHeroScroll();
        await yieldToMain();
        initReveals();
        await yieldToMain();
        initPortal();
        initPaths();
        await yieldToMain();
        initCats();
        initProcess();
        await yieldToMain();
        initBento();
        initFinale();
        initMagnetic();
        initTilt(mouse);
        finishInit();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
