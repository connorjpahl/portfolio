// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Highlight active nav link based on scroll position
const sections = document.querySelectorAll('section, header');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  let current = '';

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 90;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
});

// Collapse mobile nav after clicking a link
navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse.classList.contains('show')) {
      bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
    }
  });
});

// Show/hide back-to-top button
const backToTopBtn = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  backToTopBtn.style.display = window.scrollY > 400 ? 'flex' : 'none';
});

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Contact form validation (Bootstrap custom validation)
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  event.stopPropagation();

  if (contactForm.checkValidity()) {
    formSuccess.classList.remove('d-none');
    contactForm.reset();
    contactForm.classList.remove('was-validated');
  } else {
    formSuccess.classList.add('d-none');
    contactForm.classList.add('was-validated');
  }
});
