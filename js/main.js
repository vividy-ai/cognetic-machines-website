// InLoop Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initScrollAnimations();
    initMobileMenu();
    initFAQ();
    initContactForm();
    initSmoothScroll();
    initNavbarScroll();
});

// Scroll Animations
function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay for elements in the same section
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(element => {
        observer.observe(element);
    });
}

// Mobile Menu Toggle
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });

        // Close menu when clicking a link
        const links = navLinks.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuBtn.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
                navLinks.classList.remove('active');
                menuBtn.classList.remove('active');
            }
        });
    }
}

// FAQ Accordion
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            // Close other open items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });

            // Toggle current item
            item.classList.toggle('active');
        });
    });
}

// Contact Form
function initContactForm() {
    const form = document.getElementById('contactForm');
    const API_ENDPOINT = 'https://3m6ugn351m.execute-api.us-east-2.amazonaws.com/contact';

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            // Get form data
            const inputs = form.querySelectorAll('input, textarea');
            const data = {
                name: inputs[0].value,
                email: inputs[1].value,
                company: inputs[2].value,
                message: inputs[3].value
            };

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    btn.textContent = 'Message Sent!';
                    form.reset();
                } else {
                    btn.textContent = 'Error - Try Again';
                }
            } catch (error) {
                console.error('Error:', error);
                btn.textContent = 'Error - Try Again';
            }

            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 3000);
        });
    }
}

// Smooth Scroll for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            if (href === '#') return;

            e.preventDefault();

            const target = document.querySelector(href);
            if (target) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Navbar background on scroll
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(0, 0, 0, 0.95)';
        } else {
            navbar.style.background = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent)';
        }
    });
}

// Parallax effect for hero (optional enhancement)
function initParallax() {
    const hero = document.querySelector('.hero');
    const heroVideo = document.querySelector('.hero-video');

    if (hero && heroVideo) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.5;

            if (scrolled < window.innerHeight) {
                heroVideo.style.transform = `translateY(${rate}px)`;
            }
        });
    }
}

// Video lazy loading
function initVideoLazyLoad() {
    const videos = document.querySelectorAll('video[data-src]');

    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const video = entry.target;
                const source = video.querySelector('source');

                if (source && video.dataset.src) {
                    source.src = video.dataset.src;
                    video.load();
                    video.play();
                }

                videoObserver.unobserve(video);
            }
        });
    });

    videos.forEach(video => {
        videoObserver.observe(video);
    });
}

// Typing animation for hero title (optional)
function initTypingAnimation() {
    const heroTitle = document.querySelector('.hero-title');

    if (heroTitle) {
        heroTitle.style.opacity = '1';
    }
}

// Counter animation for stats (if needed in future)
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);

    function update() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }

    update();
}

// Utility: Debounce function
function debounce(func, wait = 20) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility: Throttle function
function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
