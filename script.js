document.addEventListener('DOMContentLoaded', function () {

    // ── Mobile nav toggle ─────────────────────────────────────────
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks  = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function () {
            navLinks.classList.toggle('open');
            hamburger.setAttribute(
                'aria-expanded',
                navLinks.classList.contains('open') ? 'true' : 'false'
            );
        });

        // Close nav when a link is clicked
        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                navLinks.classList.remove('open');
            });
        });
    }

    // ── Smooth scroll for anchor links ───────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const navH = document.querySelector('.navbar');
                const offset = navH ? navH.offsetHeight : 0;
                const top = target.getBoundingClientRect().top + window.scrollY - offset - 12;
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        });
    });

    // ── Scroll-in animation for cards ────────────────────────────
    const animEls = document.querySelectorAll(
        '.service-card, .feature-card, .step-card, .contact-card'
    );

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12 }
        );

        animEls.forEach(function (el) {
            el.classList.add('anim-ready');
            observer.observe(el);
        });
    } else {
        // Fallback: show all immediately
        animEls.forEach(function (el) {
            el.classList.add('visible');
        });
    }

    console.log('Aspen Brain loaded successfully!');
});
