// ================================================================
// script.js — frontend JavaScript for the portfolio site
//
// WHAT THIS FILE DOES:
//   1. Contact form — sends form data to the backend and shows
//      success/error messages without reloading the page
//   2. Mobile nav — toggles the nav menu open/closed on small screens
//   3. Scroll animations — fades in sections as you scroll down
//
// This file is loaded at the bottom of index.html, so all HTML
// elements already exist by the time this code runs.
// ================================================================


// ================================================================
// 1. CONTACT FORM
//
// When the form is submitted, this prevents the default browser
// form submission (which would reload the page), collects the
// field values, sends them to POST /contact on your Express server,
// and shows a success or error message.
//
// TO CHANGE WHERE IT SENDS: update the fetch URL below
// TO CHANGE VALIDATION: update the checks before the fetch call
// ================================================================
const contactForm   = document.getElementById('contact-form');
const submitBtn     = document.getElementById('submit-btn');
const btnText       = submitBtn?.querySelector('.btn-text');
const btnLoading    = submitBtn?.querySelector('.btn-loading');
const formSuccess   = document.getElementById('form-success');
const formError     = document.getElementById('form-error');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    // Stop browser from reloading the page
    e.preventDefault();

    // Hide any previous status messages
    formSuccess.hidden = true;
    formError.hidden   = true;

    // ---- CLIENT-SIDE VALIDATION ----
    const name    = contactForm.name.value.trim();
    const email   = contactForm.email.value.trim();
    const message = contactForm.message.value.trim();

    if (!name || !email || !message) {
      formError.textContent = 'Please fill in all fields.';
      formError.hidden = false;
      return;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formError.textContent = 'Please enter a valid email address.';
      formError.hidden = false;
      return;
    }

    // ---- SHOW LOADING STATE ----
    submitBtn.disabled  = true;
    btnText.hidden      = true;
    btnLoading.hidden   = false;

    // ---- SEND TO BACKEND ----
    // This sends a JSON request to POST /contact on your Express server.
    // The server handles emailing you. See server.js for that logic.
    //
    // TO TEST WITHOUT THE BACKEND:
    //   Replace the try/catch below with:
    //   console.log({ name, email, message });
    //   formSuccess.hidden = false;
    //   contactForm.reset();
    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        formSuccess.hidden = false;
        contactForm.reset();
      } else {
        // Server returned an error
        formError.textContent = data.error || 'Something went wrong.';
        formError.hidden = false;
      }

    } catch (err) {
      // Network error or server is down
      console.error('Form submission error:', err);
      formError.textContent = 'Could not reach the server. Please try again later.';
      formError.hidden = false;
    }

    // ---- RESTORE BUTTON ----
    submitBtn.disabled = false;
    btnText.hidden     = false;
    btnLoading.hidden  = true;
  });
}


// ================================================================
// 2. MOBILE NAV TOGGLE
//
// Clicking the hamburger button (nav-toggle) adds/removes the
// class "open" on the nav-links list, which CSS uses to show/hide it.
//
// See style.css → @media (max-width: 768px) for the CSS side.
// ================================================================
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.getElementById('nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    // Swap the icon between bars (☰) and X (✕)
    const icon = navToggle.querySelector('i');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-xmark');
  });

  // Close nav when a link is clicked (so menu closes after navigation)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      const icon = navToggle.querySelector('i');
      icon.classList.add('fa-bars');
      icon.classList.remove('fa-xmark');
    });
  });
}


// ================================================================
// 3. SCROLL ANIMATIONS (Fade In)
//
// Watches for elements with class="fade-in" or class="stagger".
// When they enter the viewport, adds class "visible" which CSS
// uses to transition them from invisible to visible.
//
// TO ADD AN ANIMATION TO ANY ELEMENT IN HTML:
//   Just add class="fade-in" to it. Example:
//   <div class="about-grid fade-in"> ... </div>
//
// TO REMOVE ALL ANIMATIONS:
//   Delete this whole section and remove fade-in/stagger
//   classes from index.html and the animation CSS in style.css.
//
// HOW IT WORKS:
//   IntersectionObserver is a browser API that fires a callback
//   whenever a watched element crosses into/out of the viewport.
//   Much better for performance than scroll event listeners.
// ================================================================
const observerOptions = {
  threshold: 0.1,         // trigger when 10% of the element is visible
  rootMargin: '0px 0px -50px 0px'  // slightly before it fully enters
};

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Stop watching once it's been shown (no need to re-animate)
      fadeObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Watch all elements with fade-in or stagger classes
document.querySelectorAll('.fade-in, .stagger').forEach(el => {
  fadeObserver.observe(el);
});


// ================================================================
// 4. GALLERY LIGHTBOX (optional, basic version)
//
// Clicking a gallery image opens it in a fullscreen overlay.
//
// TO DISABLE: comment out or delete this whole section.
// TO USE A FANCIER LIBRARY: replace with GLightbox or Fancybox.
// ================================================================

// Create the lightbox overlay element
const lightbox = document.createElement('div');
lightbox.id = 'lightbox';
lightbox.style.cssText = `
  display: none;
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0,0,0,0.92);
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
`;
document.body.appendChild(lightbox);

const lightboxImg = document.createElement('img');
lightboxImg.style.cssText = `
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border: 1px solid #2a2a2a;
`;
lightbox.appendChild(lightboxImg);

// Open lightbox when a gallery image is clicked
document.querySelectorAll('.gallery-item img').forEach(img => {
  img.addEventListener('click', () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // prevent background scroll
  });
});

// Close lightbox when clicking anywhere
lightbox.addEventListener('click', () => {
  lightbox.style.display = 'none';
  document.body.style.overflow = '';
});

// Also close with Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }
});
