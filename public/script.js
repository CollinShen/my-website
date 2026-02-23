// ================================================================
// script.js — frontend JavaScript
//
//   1. Mobile nav toggle
//   2. Navbar scroll effect
//   3. Active nav link highlighting
//   4. Scroll fade-in animations
//   5. Contact form submission
//   6. Gallery lightbox
// ================================================================


// ================================================================
// 1. MOBILE NAV TOGGLE
// Clicking the hamburger adds/removes .open on the nav-links list.
// CSS uses .open to show/hide the menu on small screens.
// ================================================================
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.getElementById('nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when any link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', false);
    });
  });
}


// ================================================================
// 2. NAVBAR SCROLL SHADOW
// Adds a subtle shadow to the nav once the user scrolls down.
// Controlled by the .scrolled class — style it in style.css.
// ================================================================
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });


// ================================================================
// 3. ACTIVE NAV LINK
// Highlights the nav link for whichever section is currently
// in view. Uses IntersectionObserver for performance.
//
// TO ADD MORE SECTIONS: just give them an id and add a nav link
// with href="#that-id" — this code handles the rest automatically.
// ================================================================
const sections  = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-link');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navAnchors.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));


// ================================================================
// 4. SCROLL FADE-IN ANIMATIONS
// Any element with class="fade-in" will animate into view.
// Add it to any HTML element you want to animate.
//
// TO DISABLE: remove class="fade-in" from elements in index.html
// ================================================================
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target); // only animate once
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));


// ================================================================
// 5. CONTACT FORM
// Sends form data to POST /contact on the Express server.
// Shows success/error messages without reloading the page.
//
// TO TEST WITHOUT EMAIL: comment out the fetch block and just
// log the data: console.log({ name, email, message })
// ================================================================
const contactForm = document.getElementById('contact-form');
const submitBtn   = document.getElementById('submit-btn');
const formSuccess = document.getElementById('form-success');
const formError   = document.getElementById('form-error');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Hide previous status messages
    formSuccess.hidden = true;
    formError.hidden   = true;

    const name    = contactForm.name.value.trim();
    const email   = contactForm.email.value.trim();
    const message = contactForm.message.value.trim();

    // Basic validation
    if (!name || !email || !message) {
      formError.textContent = 'Please fill in all fields.';
      formError.hidden = false;
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formError.textContent = 'Please enter a valid email address.';
      formError.hidden = false;
      return;
    }

    // Show loading state
    const btnText    = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    submitBtn.disabled = true;
    btnText.hidden     = true;
    btnLoading.hidden  = false;

    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();

      if (response.ok) {
        formSuccess.hidden = false;
        contactForm.reset();
      } else {
        formError.textContent = data.error || 'Something went wrong.';
        formError.hidden = false;
      }
    } catch (err) {
      console.error('Form error:', err);
      formError.textContent = 'Could not reach the server. Please try again later.';
      formError.hidden = false;
    }

    // Restore button
    submitBtn.disabled = false;
    btnText.hidden     = false;
    btnLoading.hidden  = true;
  });
}


// ================================================================
// 6. GALLERY LIGHTBOX
// Clicking any .ig-card img opens it fullscreen.
// Press Escape or click anywhere to close.
//
// TO DISABLE: delete this whole block.
// ================================================================
const lightbox    = document.createElement('div');
const lightboxImg = document.createElement('img');

Object.assign(lightbox.style, {
  display: 'none', position: 'fixed', inset: '0',
  zIndex: '999', background: 'rgba(42,31,20,0.92)',
  alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
});

Object.assign(lightboxImg.style, {
  maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain',
  border: '1px solid rgba(255,255,255,0.1)'
});

lightbox.appendChild(lightboxImg);
document.body.appendChild(lightbox);

document.querySelectorAll('.ig-card img').forEach(img => {
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
});

lightbox.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

function closeLightbox() {
  lightbox.style.display = 'none';
  document.body.style.overflow = '';
}
