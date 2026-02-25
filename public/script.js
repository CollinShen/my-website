// ================================================================
// script.js
//
//   1. Nav (mobile toggle, scroll shadow, active link)
//   2. Scroll fade-in
//   3. Timeline accordion
//   4. Contact form
//   5. Photo gallery lightbox
//   6. Instagram feed
//   7. Journey timeline (loaded from /api/journey/public)
//   8. Spotify widget (now playing + top tracks/artists)
// ================================================================


// ================================================================
// 1. NAV
// ================================================================
const navbar    = document.getElementById('navbar');
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.getElementById('nav-links');

navToggle?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
});

navLinks?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
  });
});

window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Active nav link
const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-link');

new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' }).observe && sections.forEach(s => {
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting)
        navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-40% 0px -55% 0px' }).observe(s);
});


// ================================================================
// 2. SCROLL FADE-IN
// ================================================================
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); fadeObserver.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));


// ================================================================
// 3. DUAL TIMELINE ACCORDION
// ================================================================
document.querySelectorAll('.dt-header').forEach(btn => {
  btn.addEventListener('click', () => {
    const entry  = btn.closest('.dt-entry');
    const isOpen = entry.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
  });
});


// ================================================================
// 4. CONTACT FORM
// ================================================================
const contactForm = document.getElementById('contact-form');
const submitBtn   = document.getElementById('submit-btn');
const formSuccess = document.getElementById('form-success');
const formError   = document.getElementById('form-error');

contactForm?.addEventListener('submit', async e => {
  e.preventDefault();
  formSuccess.hidden = formError.hidden = true;

  const name    = contactForm.name.value.trim();
  const email   = contactForm.email.value.trim();
  const message = contactForm.message.value.trim();

  if (!name || !email || !message) {
    formError.textContent = 'Please fill in all fields.'; formError.hidden = false; return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    formError.textContent = 'Please enter a valid email.'; formError.hidden = false; return;
  }

  const btnText    = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  submitBtn.disabled = true; btnText.hidden = true; btnLoading.hidden = false;

  try {
    const res  = await fetch('/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
    const data = await res.json();
    if (res.ok) { formSuccess.hidden = false; contactForm.reset(); }
    else { formError.textContent = data.error || 'Something went wrong.'; formError.hidden = false; }
  } catch { formError.textContent = 'Could not reach the server.'; formError.hidden = false; }

  submitBtn.disabled = false; btnText.hidden = false; btnLoading.hidden = true;
});


// ================================================================
// 5. PHOTO GALLERY LIGHTBOX
// ================================================================
const lightbox    = document.createElement('div');
lightbox.id       = 'lightbox';
const lightboxImg = document.createElement('img');
lightbox.appendChild(lightboxImg);
document.body.appendChild(lightbox);

function openLightbox(src, alt) {
  lightboxImg.src = src; lightboxImg.alt = alt || '';
  lightbox.classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeLightbox() { lightbox.classList.remove('open'); document.body.style.overflow = ''; }

function initGallery() {
  document.querySelectorAll('#photo-gallery .gallery-item img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLightbox(img.src, img.alt));
  });
}
initGallery();

lightbox.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });


// ================================================================
// 6. INSTAGRAM FEED
// ================================================================
async function loadInstagramFeed() {
  const feed    = document.getElementById('ig-feed');
  const loading = document.getElementById('ig-loading');
  if (!feed) return;

  try {
    const res  = await fetch('/api/instagram');
    const data = await res.json();
    loading?.remove();

    if (!res.ok || data.error) {
      feed.innerHTML = `<div class="ig-setup"><i class="fab fa-instagram"></i><strong>Instagram not connected yet</strong><span>Add INSTAGRAM_TOKEN to .env — see server.js for instructions.</span></div>`;
      return;
    }

    const posts = data.data || [];
    if (!posts.length) { feed.innerHTML = `<div class="ig-setup"><i class="fab fa-instagram"></i><span>No posts found.</span></div>`; return; }

    posts.forEach(post => {
      const imgSrc  = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
      const caption = post.caption ? post.caption.slice(0, 120) + (post.caption.length > 120 ? '…' : '') : '';
      const a = document.createElement('a');
      a.className = `ig-post${post.media_type === 'VIDEO' ? ' video' : ''}`;
      a.href = post.permalink; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.innerHTML = `<img src="${imgSrc}" alt="${caption}" loading="lazy" /><div class="ig-post-overlay"><span>${caption}</span></div>`;
      feed.appendChild(a);
    });
  } catch (err) {
    console.error('Instagram error:', err);
    if (loading) loading.innerHTML = `<i class="fab fa-instagram"></i><span>Could not load posts.</span>`;
  }
}
loadInstagramFeed();


// ================================================================
// 7. JOURNEY TIMELINE
// Fetches entries from /api/journey/public and renders them.
// The admin page (/admin.html) is where you add new entries.
// ================================================================
async function loadJourney() {
  const container = document.getElementById('wl-timeline-container');
  if (!container) return;

  try {
    const res     = await fetch('/api/journey/public');
    const entries = await res.json();

    if (!entries.length) {
      container.innerHTML = `
        <div class="wl-empty">
          <p>No entries yet — check back soon.</p>
        </div>`;
      return;
    }

    container.innerHTML = '';

    entries.forEach((entry, i) => {
      const isLast  = i === entries.length - 1;
      const badgeClass = entry.badgeStyle === 'milestone' ? 'wl-badge milestone' : 'wl-badge';

      const div = document.createElement('div');
      div.className = 'wl-entry';
      div.innerHTML = `
        <div class="wl-marker">
          <div class="wl-dot"></div>
          ${!isLast ? '<div class="wl-line"></div>' : ''}
        </div>
        <div class="wl-body">
          <div class="wl-meta">
            <span class="wl-date">${formatDate(entry.date)}</span>
            <span class="wl-weight">${entry.weight} lbs</span>
            ${entry.badge ? `<span class="${badgeClass}">${entry.badge}</span>` : ''}
          </div>
          ${entry.note ? `<p class="wl-note">${entry.note}</p>` : ''}
          ${entry.photo ? `
            <div class="wl-photo">
              <img src="${entry.photo}" alt="${entry.date} progress photo" loading="lazy" />
            </div>` : ''}
        </div>`;

      // Photo click → lightbox
      const img = div.querySelector('.wl-photo img');
      if (img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => openLightbox(img.src, img.alt));
      }

      container.appendChild(div);
    });

  } catch (err) {
    console.error('Journey load error:', err);
    container.innerHTML = `<p style="color:var(--faint);font-size:0.85rem">Could not load journey entries.</p>`;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  // dateStr is YYYY-MM-DD from the date input
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

loadJourney();


// ================================================================
// 8. SPOTIFY WIDGET
//
// Shows: currently playing track + top artists/tracks with
// a time range toggle (Last 4 Weeks / 6 Months / All Time).
//
// If Spotify isn't connected yet, shows a setup message.
// ================================================================
let currentSpotifyRange = 'short_term';

async function loadNowPlaying() {
  const widget = document.getElementById('spotify-now-playing');
  if (!widget) return;

  try {
    const res  = await fetch('/api/spotify/now-playing');
    const data = await res.json();

    if (!res.ok || data.error === 'not_configured') {
      widget.innerHTML = `
        <div class="spotify-setup">
          <i class="fab fa-spotify"></i>
          <div>
            <strong>Spotify not connected</strong>
            <span>Visit <code>/api/spotify/auth</code> to set it up — see server.js for instructions.</span>
          </div>
        </div>`;
      return;
    }

    if (!data.isPlaying) {
      widget.innerHTML = `
        <div class="spotify-offline">
          <i class="fab fa-spotify"></i>
          <span>Not listening right now</span>
        </div>`;
      return;
    }

    const pct = Math.round((data.progressMs / data.durationMs) * 100);
    widget.innerHTML = `
      <a class="spotify-track" href="${data.url}" target="_blank" rel="noopener">
        ${data.albumArt ? `<img src="${data.albumArt}" alt="${data.album}" class="spotify-art" />` : ''}
        <div class="spotify-info">
          <div class="spotify-now-label"><i class="fab fa-spotify"></i> Now Playing</div>
          <div class="spotify-track-name">${data.track}</div>
          <div class="spotify-artist">${data.artist}</div>
          <div class="spotify-bar-wrap">
            <div class="spotify-bar"><div class="spotify-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </div>
      </a>`;

  } catch (err) {
    console.error('Spotify now-playing error:', err);
  }
}

async function loadTopSpotify(range) {
  currentSpotifyRange = range;
  const container = document.getElementById('spotify-top-container');
  if (!container) return;

  // Update active tab button
  document.querySelectorAll('.spotify-range-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === range);
  });

  container.innerHTML = `<div class="spotify-loading"><i class="fab fa-spotify"></i><span>Loading…</span></div>`;

  try {
    const res  = await fetch(`/api/spotify/top?range=${range}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.error === 'not_configured'
        ? 'Spotify not connected. See server.js for setup.'
        : 'Not enough listening history for this time range yet.';
      container.innerHTML = `<div class="spotify-setup"><span>${msg}</span></div>`;
      return;
    }

    if (!data.artists?.length && !data.tracks?.length) {
      container.innerHTML = `<div class="spotify-setup"><span>Not enough listening history for this time range yet.</span></div>`;
      return;
    }

    const rangeLabel = { short_term: 'Last 4 Weeks', medium_term: 'Last 6 Months', long_term: 'All Time' }[range];

    const artistHTML = data.artists.map((a, i) => `
      <a class="spotify-artist-item" href="${a.url}" target="_blank" rel="noopener">
        <span class="spotify-rank">${i + 1}</span>
        ${a.image ? `<img src="${a.image}" alt="${a.name}" class="spotify-artist-img" />` : '<div class="spotify-artist-img-placeholder"></div>'}
        <div class="spotify-artist-info">
          <span class="spotify-artist-name">${a.name}</span>
          ${a.genres.length ? `<span class="spotify-genres">${a.genres.join(', ')}</span>` : ''}
        </div>
      </a>`).join('');

    const trackHTML = data.tracks.map((t, i) => `
      <a class="spotify-track-item" href="${t.url}" target="_blank" rel="noopener">
        <span class="spotify-rank">${i + 1}</span>
        ${t.albumArt ? `<img src="${t.albumArt}" alt="${t.album}" class="spotify-album-art" />` : '<div class="spotify-album-art-placeholder"></div>'}
        <div class="spotify-track-info">
          <span class="spotify-track-name">${t.name}</span>
          <span class="spotify-track-artist">${t.artist}</span>
        </div>
      </a>`).join('');

    container.innerHTML = `
      <div class="spotify-top-wrap-inner">
        <div class="spotify-col">
          <p class="spotify-col-header">Top Artists</p>
          ${artistHTML}
        </div>
        <div class="spotify-col">
          <p class="spotify-col-header">Top Tracks</p>
          ${trackHTML}
        </div>
      </div>`;

  } catch (err) {
    console.error('Spotify top error:', err);
    container.innerHTML = `<p style="color:var(--faint);font-size:0.85rem;padding:1rem">Could not load Spotify data.</p>`;
  }
}

// Wire up range buttons
document.querySelectorAll('.spotify-range-btn').forEach(btn => {
  btn.addEventListener('click', () => loadTopSpotify(btn.dataset.range));
});

// Initial load
loadNowPlaying();
loadTopSpotify('short_term');

// Refresh now-playing every 30 seconds
setInterval(loadNowPlaying, 30000);

// ── GALLERY TOGGLE (mobile only) ─────────────────────────────
(function () {
  const toggle = document.querySelector('.gallery-toggle');
  const grid   = document.getElementById('photo-gallery');
  if (!toggle || !grid) return;

  const isMobile = () => window.innerWidth <= 768;

  function collapse() {
    grid.classList.add('gallery-collapsed');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = 'Show <i class="fa fa-chevron-down"></i>';
  }
  function expand() {
    grid.classList.remove('gallery-collapsed');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.innerHTML = 'Hide <i class="fa fa-chevron-up"></i>';
  }

  // Start collapsed on mobile
  if (isMobile()) collapse();

  toggle.addEventListener('click', () => {
    grid.classList.contains('gallery-collapsed') ? expand() : collapse();
  });

  // Reset if window resizes past breakpoint
  window.addEventListener('resize', () => {
    if (!isMobile()) expand();
    else if (!toggle.classList.contains('open')) collapse();
  }, { passive: true });
})();


// ── IMAGE ROTATORS (hero + section headers) ──────────────────
// Each slot has its own image list so you can swap them out independently later.
// To give a slot its own photos: replace its array with e.g. 'images/hero/IMG_xyz.JPG'

// ★ HERO — swap in: images/hero/
const heroImages = [
  'images/IMG_6727.JPG', 'images/IMG_0764.JPG', 'images/IMG_1983.JPG',
  'images/IMG_2434.JPG', 'images/IMG_2455.JPG', 'images/IMG_3359.JPG',
  'images/IMG_7740.PNG', 'images/IMG_8237.JPG', 'images/IMG_8776.JPG',
  'images/IMG_9746.JPG'
];

// ★ ABOUT ME — swap in: images/about/
const aboutImages = [
  'images/IMG_6727.JPG', 'images/IMG_0764.JPG', 'images/IMG_1983.JPG',
  'images/IMG_2434.JPG', 'images/IMG_2455.JPG', 'images/IMG_3359.JPG',
  'images/IMG_7740.PNG', 'images/IMG_8237.JPG', 'images/IMG_8776.JPG',
  'images/IMG_9746.JPG'
];

// ★ MY CAREER — swap in: images/career/
const careerImages = [
  'images/IMG_6727.JPG', 'images/IMG_0764.JPG', 'images/IMG_1983.JPG',
  'images/IMG_2434.JPG', 'images/IMG_2455.JPG', 'images/IMG_3359.JPG',
  'images/IMG_7740.PNG', 'images/IMG_8237.JPG', 'images/IMG_8776.JPG',
  'images/IMG_9746.JPG'
];

// ★ MY CONTENT — swap in: images/content/
const contentImages = [
  'images/IMG_6727.JPG', 'images/IMG_0764.JPG', 'images/IMG_1983.JPG',
  'images/IMG_2434.JPG', 'images/IMG_2455.JPG', 'images/IMG_3359.JPG',
  'images/IMG_7740.PNG', 'images/IMG_8237.JPG', 'images/IMG_8776.JPG',
  'images/IMG_9746.JPG'
];

function startRotator(id, imageList, startIdx) {
  let idx = startIdx % imageList.length;
  const el = document.getElementById(id);
  if (!el) return;
  setInterval(() => {
    idx = (idx + 1) % imageList.length;
    el.style.opacity = '0';
    setTimeout(() => { el.src = imageList[idx]; el.style.opacity = '1'; }, 600);
  }, 3000);
}

// Stagger start positions so all four don't show the same photo at once
startRotator('hero-photo',    heroImages,    0);
startRotator('about-photo',   aboutImages,   3);
startRotator('career-photo',  careerImages,  6);
startRotator('content-photo', contentImages, 8);