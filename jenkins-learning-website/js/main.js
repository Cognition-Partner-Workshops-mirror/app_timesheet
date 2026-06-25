/* ==========================================================================
   Jenkins Pipeline Masterclass - Main JavaScript
   Handles: Particles, Typing Animation, Navigation, Scroll Effects, Stats Counter
   ========================================================================== */

// ============================================================================
// Particle Animation System - Floating particles in background
// ============================================================================
class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.connections = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.particleCount = 80; // Number of floating particles
        this.connectionDistance = 150;
        this.init();
    }

    init() {
        this.resize();
        this.createParticles();
        this.bindEvents();
        this.animate();
    }

    resize() {
        // Set canvas to full window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        // Generate random particles with position, velocity, and size
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.5 + 0.1,
                color: this.getRandomColor()
            });
        }
    }

    getRandomColor() {
        // Jenkins-themed color palette for particles
        const colors = [
            'rgba(211, 56, 51, ',   // Jenkins Red
            'rgba(96, 165, 250, ',  // Blue
            'rgba(52, 211, 153, ',  // Green
            'rgba(251, 191, 36, ',  // Yellow
            'rgba(167, 139, 250, ', // Purple
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    bindEvents() {
        // Track mouse for interactive particle effects
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw each particle
        this.particles.forEach((particle, i) => {
            // Move particle
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

            // Keep within bounds
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color + particle.opacity + ')';
            this.ctx.fill();

            // Draw connections between nearby particles
            for (let j = i + 1; j < this.particles.length; j++) {
                const other = this.particles[j];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.connectionDistance) {
                    const opacity = (1 - distance / this.connectionDistance) * 0.15;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(other.x, other.y);
                    this.ctx.strokeStyle = `rgba(211, 56, 51, ${opacity})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        });

        requestAnimationFrame(() => this.animate());
    }
}

// ============================================================================
// Typing Animation - Hero subtitle with rotating messages
// ============================================================================
class TypingAnimation {
    constructor(elementId, messages) {
        this.element = document.getElementById(elementId);
        this.messages = messages;
        this.currentMessage = 0;
        this.currentChar = 0;
        this.isDeleting = false;
        this.typeSpeed = 50;
        this.deleteSpeed = 30;
        this.pauseTime = 2000;
        this.type();
    }

    type() {
        const fullMessage = this.messages[this.currentMessage];

        if (this.isDeleting) {
            // Remove characters one by one
            this.currentChar--;
            this.element.textContent = fullMessage.substring(0, this.currentChar);
        } else {
            // Add characters one by one
            this.currentChar++;
            this.element.textContent = fullMessage.substring(0, this.currentChar);
        }

        let delay = this.isDeleting ? this.deleteSpeed : this.typeSpeed;

        if (!this.isDeleting && this.currentChar === fullMessage.length) {
            // Finished typing, pause before deleting
            delay = this.pauseTime;
            this.isDeleting = true;
        } else if (this.isDeleting && this.currentChar === 0) {
            // Finished deleting, move to next message
            this.isDeleting = false;
            this.currentMessage = (this.currentMessage + 1) % this.messages.length;
            delay = 500;
        }

        setTimeout(() => this.type(), delay);
    }
}

// ============================================================================
// Navigation System - Scroll detection, active link, mobile menu
// ============================================================================
class Navigation {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.navToggle = document.getElementById('nav-toggle');
        this.navMenu = document.getElementById('nav-links');
        this.sections = document.querySelectorAll('.section, .hero');
        this.init();
    }

    init() {
        // Scroll handler for sticky nav and active section
        window.addEventListener('scroll', () => this.onScroll());
        
        // Mobile menu toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => this.toggleMobile());
        }

        // Close mobile menu on link click
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (this.navMenu) this.navMenu.classList.remove('active');
            });
        });
    }

    onScroll() {
        // Add scrolled class to navbar for background effect
        if (window.scrollY > 50) {
            this.navbar.classList.add('scrolled');
        } else {
            this.navbar.classList.remove('scrolled');
        }

        // Update active nav link based on scroll position
        let current = '';
        this.sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    toggleMobile() {
        // Toggle mobile navigation menu
        if (this.navMenu) {
            this.navMenu.classList.toggle('active');
        }
    }
}

// ============================================================================
// Stats Counter Animation - Animate numbers on hero section
// ============================================================================
class StatsCounter {
    constructor() {
        this.stats = document.querySelectorAll('.stat-number');
        this.animated = false;
        this.init();
    }

    init() {
        // Use Intersection Observer to trigger animation when visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animated) {
                    this.animated = true;
                    this.animateAll();
                }
            });
        }, { threshold: 0.5 });

        const heroStats = document.querySelector('.hero-stats');
        if (heroStats) observer.observe(heroStats);
    }

    animateAll() {
        this.stats.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            this.countUp(stat, target);
        });
    }

    countUp(element, target) {
        // Smooth counting animation from 0 to target
        let current = 0;
        const increment = target / 60;
        const duration = 2000;
        const stepTime = duration / 60;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, stepTime);
    }
}

// ============================================================================
// Scroll Reveal Animation - Fade in elements as they enter viewport
// ============================================================================
class ScrollReveal {
    constructor() {
        this.elements = document.querySelectorAll('.glass-card, .timeline-item, .intro-card, .topic-card');
        this.init();
    }

    init() {
        // Add fade-in class to elements
        this.elements.forEach(el => {
            el.classList.add('fade-in');
        });

        // Observe each element
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add staggered delay based on sibling index
                    const delay = this.getStaggerDelay(entry.target);
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, delay);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        this.elements.forEach(el => observer.observe(el));
    }

    getStaggerDelay(element) {
        // Calculate stagger delay based on position among siblings
        const parent = element.parentElement;
        if (!parent) return 0;
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(element);
        return index * 100; // 100ms between each element
    }
}

// ============================================================================
// Smooth Scroll Helper - Scroll to section by ID
// ============================================================================
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================================================
// Initialize Everything on DOM Load
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle background animation
    const particles = new ParticleSystem('particles-canvas');

    // Initialize typing animation with Jenkins-focused messages
    const typingMessages = [
        'Learn Everything Jenkins From Beginner to Production',
        'Watch Jenkins Execute Every Pipeline Stage in Real-Time',
        'Understand Jenkins Architecture, Agents, and Executors',
        'Master Declarative and Scripted Pipelines',
        'Build Production-Grade CI/CD with Jenkins',
        'Interactive Jenkins Simulator with Rich Animations'
    ];
    const typing = new TypingAnimation('typing-text', typingMessages);

    // Initialize navigation
    const nav = new Navigation();

    // Initialize stats counter
    const stats = new StatsCounter();

    // Initialize scroll reveal animations
    const reveal = new ScrollReveal();

    // Log initialization complete
    console.log('[Jenkins Masterclass] All systems initialized.');
});
