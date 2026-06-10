/**
 * Riderr — Dynamic Navigation
 * Renders the correct navbar based on authentication state.
 *
 * PUBLIC (not logged in):
 *   Home | About | Routes | Book Ride (CTA) | Tickets | Support | [Sign In]
 *
 * AUTHENTICATED (logged in):
 *   Dashboard | Book Ride (CTA) | My Tickets | Profile | [Logout]
 */

(function () {
  'use strict';

  const user = (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const isLoggedIn = !!user;

  /* ── Build nav links ───────────────────────────────────────── */
  const publicLinks = [
    { label: 'Home',      href: 'index.html' },
    { label: 'About',     href: 'index.html#about' },
    { label: 'Routes',    href: 'destinations.html' },
    { label: 'Tickets',   href: 'index.html#tickets' },
    { label: 'Support',   href: 'complaint.html' },
  ];

  const authLinks = [
    { label: 'Dashboard',  href: 'dashboard.html' },
    { label: 'My Tickets', href: 'tickets.html' },
  ];

  /* ── Detect current page for active state ──────────────────── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  function isActive(href) {
    // Match by filename (ignore hash)
    const file = href.split('#')[0] || 'index.html';
    return currentPage === file;
  }

  /* ── Render ────────────────────────────────────────────────── */
  const nav = document.querySelector('.site-header nav');
  if (!nav) return;

  nav.innerHTML = ''; // Clear existing content

  // Mobile hamburger toggle
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Toggle navigation');
  hamburger.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(hamburger);

  // Link container
  const linkWrap = document.createElement('div');
  linkWrap.className = 'nav-links';

  const links = isLoggedIn ? authLinks : publicLinks;

  links.forEach(({ label, href }) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (isActive(href)) a.classList.add('nav-active');
    linkWrap.appendChild(a);
  });

  // "Book Ride" CTA (always visible)
  const bookCta = document.createElement('a');
  bookCta.href = 'index.html#tickets';
  bookCta.textContent = 'Book Ride';
  bookCta.className = 'nav-cta';
  if (currentPage === 'booking.html') bookCta.classList.add('nav-active');
  linkWrap.appendChild(bookCta);

  nav.appendChild(linkWrap);

  // Right‐side auth area
  const authArea = document.createElement('div');
  authArea.className = 'nav-auth';

  if (isLoggedIn) {
    // Profile button
    const profileBtn = document.createElement('a');
    profileBtn.href = '#';
    profileBtn.className = 'nav-profile-btn';
    const firstName = user.name ? user.name.split(' ')[0] : 'User';
    profileBtn.innerHTML = `<span class="nav-avatar">${firstName.charAt(0).toUpperCase()}</span> ${firstName}`;
    authArea.appendChild(profileBtn);

    // Logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'nav-logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
    authArea.appendChild(logoutBtn);
  } else {
    const signInBtn = document.createElement('a');
    signInBtn.href = 'login.html';
    signInBtn.className = 'nav-signin-btn';
    signInBtn.textContent = 'Sign In';
    authArea.appendChild(signInBtn);
  }

  nav.appendChild(authArea);

  /* ── Mobile toggle ─────────────────────────────────────────── */
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('nav-open');
    hamburger.classList.toggle('active');
  });

  // Close mobile nav when a link is clicked
  linkWrap.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('nav-open');
      hamburger.classList.remove('active');
    });
  });
})();
