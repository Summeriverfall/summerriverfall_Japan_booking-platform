(() => {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const links = nav.querySelectorAll('.nav-links a[href^="#"]');
  const sections = [...links]
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const setNavState = () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 48);

    const offset = nav.offsetHeight + 24;
    if (!sections.length) return;

    let current = sections[0];

    sections.forEach((section) => {
      if (window.scrollY >= section.offsetTop - offset) current = section;
    });

    links.forEach((link) => {
      if (!current) return;
      link.classList.toggle('is-active', link.getAttribute('href') === `#${current.id}`);
    });
  };

  window.addEventListener('scroll', setNavState, { passive: true });
  setNavState();

  const revealItems = document.querySelectorAll('.reveal');
  if (revealItems.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const carousel = document.querySelector('.menu-carousel');
  if (carousel) {
    const slides = carousel.querySelectorAll('.menu-carousel__slide');
    const dots = carousel.querySelectorAll('.menu-carousel__dot');
    if (slides.length > 1) {
      let current = 0;
      let timer;

      const show = (index) => {
        current = index;
        slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      };

      const next = () => show((current + 1) % slides.length);

      const start = () => {
        clearInterval(timer);
        timer = setInterval(next, 4500);
      };

      const stop = () => clearInterval(timer);

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!reducedMotion) {
        start();
        carousel.addEventListener('mouseenter', stop);
        carousel.addEventListener('mouseleave', start);
      }

      dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
          show(i);
          if (!reducedMotion) start();
        });
      });
    }
  }
})();
