(() => {
  const PHONE = '+17802802404';

  // Floating buttons keep out of the way: they hide while certain parts of the page are on screen
  const hideNear = (el, zones) => {
    zones = zones.filter(Boolean);
    if (!el || !zones.length || !('IntersectionObserver' in window)) { if (el) el.classList.remove('is-hidden'); return; }
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      el.classList.toggle('is-hidden', seen.size > 0);
    }, { threshold: 0.12 });
    zones.forEach((z) => io.observe(z));
  };
  const formZone = document.getElementById('contact');
  const footZone = document.querySelector('.foot');
  hideNear(document.querySelector('.help'), [formZone, footZone]);
  // "Get a price": not on the first screen (the top already has one), not next to the form or the footer
  hideNear(document.querySelector('.quick'), [document.querySelector('.hero, .sv-hero'), formZone, footZone]);

  // Phone menu
  const burger = document.querySelector('.bar__burger');
  const mnav = document.getElementById('mnav');
  if (burger && mnav) {
    const closeBtn = mnav.querySelector('.mnav__close');
    const open = () => {
      mnav.hidden = false;
      mnav.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('menu-open');
      closeBtn.focus();
    };
    const close = () => {
      mnav.hidden = true;
      mnav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('menu-open');
    };
    burger.addEventListener('click', open);
    closeBtn.addEventListener('click', () => { close(); burger.focus(); });
    mnav.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mnav.hidden) { close(); burger.focus(); }
    });
  }

  // Blocks and heading lines appear as they scroll into view
  const reveal = document.querySelectorAll('.rv, .rvh');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }), { rootMargin: '0px 0px -10% 0px' });
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add('in'));
  }

  // Menu bar: a small white logo appears in it once the big logo (home) or the logo row (other pages) has scrolled away
  const bar = document.querySelector('.bar');
  const watch = document.querySelector('.hero__logo') || document.querySelector('.hd');
  if (bar && watch && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => bar.classList.toggle('is-on', !e.isIntersecting), {
      rootMargin: '-80px 0px 0px 0px',
    }).observe(watch);
  }

  // Before / after sliders (one per job)
  document.querySelectorAll('.ba').forEach((ba) => {
    const handle = ba.querySelector('.ba__handle');
    const before = ba.querySelector('.ba__before');
    const inner = ba.querySelector('.ba__in');
    const track = ba.querySelector('.ba__track');
    let pos = 50;
    let drag = null;
    let touched = false;
    let animTimer;
    let frame = 0;
    let box = null;

    // at most one update per screen frame, transforms only
    const paint = () => {
      frame = 0;
      before.style.transform = 'translate3d(' + (pos - 100) + '%,0,0)';
      inner.style.transform = 'translate3d(' + (100 - pos) + '%,0,0)';
      track.style.transform = 'translate3d(' + pos + '%,0,0)';
      handle.setAttribute('aria-valuenow', Math.round(pos));
    };
    const set = (p, now) => {
      pos = Math.min(100, Math.max(0, p));
      if (now) { cancelAnimationFrame(frame); paint(); }
      else if (!frame) frame = requestAnimationFrame(paint);
    };
    const animTo = (p) => {
      ba.classList.add('is-anim');
      set(p, true);
      clearTimeout(animTimer);
      animTimer = setTimeout(() => ba.classList.remove('is-anim'), 760);
    };
    const stopAnim = () => {
      touched = true;
      clearTimeout(animTimer);
      ba.classList.remove('is-anim');
    };
    // the slider's box is measured once per touch, not on every move
    const xToPos = (x) => {
      if (!box) box = ba.getBoundingClientRect();
      return ((x - box.left) / box.width) * 100;
    };

    // Mouse drags right away; touch waits for a sideways move so the page can still scroll
    ba.addEventListener('pointerdown', (e) => {
      stopAnim();
      box = ba.getBoundingClientRect();
      drag = { id: e.pointerId, x: e.clientX, moved: e.pointerType === 'mouse' };
      if (drag.moved) {
        set(xToPos(e.clientX));
        try { ba.setPointerCapture(e.pointerId); } catch (err) { /* no capture: the drag still works while the pointer is over the photo */ }
        ba.classList.add('is-drag');
      }
    });
    ba.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.x) < 6) return;
        drag.moved = true;
        ba.classList.add('is-drag');
      }
      set(xToPos(e.clientX));
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (e.type === 'pointerup' && !drag.moved) set(xToPos(e.clientX)); // a tap moves the divider there
      drag = null;
      box = null;
      ba.classList.remove('is-drag');
    };
    ba.addEventListener('pointerup', end);
    ba.addEventListener('pointercancel', end);

    handle.addEventListener('keydown', (e) => {
      const steps = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 };
      if (e.key in steps) set(pos + steps[e.key]);
      else if (e.key === 'Home') set(0);
      else if (e.key === 'End') set(100);
      else return;
      e.preventDefault();
      stopAnim();
    });

    // One gentle sweep the first time the slider is on screen, so it's clear it moves
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        [30, 70, 50].forEach((p, i) => setTimeout(() => { if (!touched) animTo(p); }, 400 + i * 800));
      }, { threshold: 0.6 });
      io.observe(ba);
    }

    // Several jobs: each <article class="proj"> carries its photos; thumbnails and arrows switch between them
    const projs = [...document.querySelectorAll('.proj')];
    const nav = document.querySelector('.proj__nav');
    if (ba.id !== 'ba' || projs.length < 2 || !nav) return;
    const imgAfter = ba.querySelector(':scope > img');
    const imgBefore = ba.querySelector('.ba__before img');
    const thumbs = nav.querySelector('.proj__thumbs');
    const count = nav.querySelector('.proj__count');
    const cta = document.querySelector('.work__cta');
    let cur = 0;

    const pick = (i, quiet) => {
      cur = (i + projs.length) % projs.length;
      const p = projs[cur];
      const title = p.querySelector('.proj__t').textContent;
      projs.forEach((x) => x.classList.toggle('is-on', x === p));
      buttons.forEach((b, j) => b.setAttribute('aria-current', j === cur ? 'true' : 'false'));
      imgAfter.src = p.dataset.after;
      imgBefore.src = p.dataset.before;
      imgAfter.alt = 'After: ' + title;
      imgBefore.alt = 'Before: ' + title;
      imgBefore.classList.toggle('ba__flip', p.hasAttribute('data-flip'));
      imgBefore.style.objectPosition = p.dataset.pos || '';
      if (cta && p.dataset.job) cta.dataset.service = p.dataset.job;
      count.textContent = (cur + 1) + ' / ' + projs.length;
      if (!quiet) {
        stopAnim();
        set(50);
        // on a phone the thumbnails sit under the photo — bring the photo into view
        const r = ba.getBoundingClientRect();
        if (r.top < (bar ? bar.getBoundingClientRect().bottom : 0) || r.bottom > innerHeight) ba.scrollIntoView({ block: 'center' });
      }
    };

    const buttons = projs.map((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'proj__thumb';
      b.setAttribute('aria-label', p.querySelector('.proj__t').textContent);
      b.innerHTML = '<img alt="" loading="lazy">';
      b.firstChild.src = p.dataset.after;
      b.addEventListener('click', () => pick(i));
      thumbs.appendChild(b);
      return b;
    });

    nav.querySelector('.proj__prev').addEventListener('click', () => pick(cur - 1));
    nav.querySelector('.proj__next').addEventListener('click', () => pick(cur + 1));
    nav.hidden = false;
    pick(0, true);
  });

  // Google reviews: drawn from the JSON in #reviews-data
  const rev = document.getElementById('reviews');
  if (rev) {
    const starsSvg = (n) => [1, 2, 3, 4, 5].map((i) => '<svg class="' + (i <= Math.round(n) ? '' : 'off') + '"><use href="#i-star"/></svg>').join('');
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const render = (d) => {
      const list = rev.querySelector('.rev__list');
      const items = Array.isArray(d.reviews) ? d.reviews.filter((r) => r && r.text) : [];
      list.textContent = '';
      items.forEach((r) => {
        const card = el('figure', 'rev__card');
        card.setAttribute('role', 'listitem');
        const text = el('blockquote', 'rev__text', '“' + String(r.text).trim() + '”');
        const cap = el('figcaption');
        cap.append(el('b', 'rev__name', r.name || 'Google user'));
        if (r.place) cap.append(el('span', 'rev__place', r.place));
        card.append(text, cap);
        list.append(card);
        // "Read more" only when the text is actually cut
        requestAnimationFrame(() => {
          if (text.scrollHeight <= text.clientHeight + 2) return;
          const more = el('button', 'rev__more', 'Read more');
          more.type = 'button';
          more.addEventListener('click', () => { const open = card.classList.toggle('is-open'); more.textContent = open ? 'Show less' : 'Read more'; });
          text.after(more);
        });
      });
      const stars = rev.querySelector('.rev__line .stars');
      const all = rev.querySelector('.rev__all');
      if (d.rating) {
        stars.innerHTML = starsSvg(d.rating);
        rev.querySelector('.rev__rated').textContent = 'Rated ' + Number(d.rating).toFixed(1) + ' on Google';
      } else stars.innerHTML = '<svg class="rev__g"><use href="#i-google"/></svg>';
      all.hidden = !d.profile;
      if (d.profile) { all.href = d.profile; all.textContent = (d.count ? 'Read all ' + d.count + ' reviews on Google' : 'Read the reviews on Google') + ' →'; }
      const cta = rev.querySelector('.rev__cta');
      if (d.write) cta.href = d.write; else cta.removeAttribute('href');
      rev.querySelector('.rev__nolink').hidden = !!d.write;
    };
    try { render(JSON.parse(document.getElementById('reviews-data').textContent)); } catch (err) { /* broken JSON: the block stays as in the HTML */ }
  }

  // Photo cards: a tap opens the photo full size; arrows, keys or a swipe go to the next one
  const lb = document.getElementById('lb');
  const shots = [...document.querySelectorAll('.card')];
  if (lb && shots.length && lb.showModal) {
    const img = lb.querySelector('.lb__img');
    const cap = lb.querySelector('.lb__cap');
    let at = 0;
    let sx = null;
    let swiped = false;

    const show = (i) => {
      at = (i + shots.length) % shots.length;
      const a = shots[at];
      img.src = a.getAttribute('href');
      img.alt = a.querySelector('img').alt;
      cap.textContent = a.querySelector('.card__t').textContent + '  ·  ' + (at + 1) + ' / ' + shots.length;
    };

    shots.forEach((a, i) => a.addEventListener('click', (e) => {
      e.preventDefault();
      show(i);
      lb.showModal();
      document.documentElement.classList.add('lb-open');
    }));
    const unlock = () => document.documentElement.classList.remove('lb-open');
    const shut = () => { lb.close(); unlock(); };
    lb.addEventListener('cancel', unlock); // Esc
    lb.addEventListener('close', unlock);
    lb.querySelector('.lb__close').addEventListener('click', shut);
    lb.querySelector('.lb__prev').addEventListener('click', () => show(at - 1));
    lb.querySelector('.lb__next').addEventListener('click', () => show(at + 1));
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });
    lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    lb.addEventListener('pointerup', (e) => {
      if (sx !== null && Math.abs(e.clientX - sx) > 50) {
        swiped = true;
        show(at + (e.clientX < sx ? 1 : -1));
      }
      sx = null;
    });
    // a click on the dark area around the photo closes it
    lb.addEventListener('click', (e) => {
      if (swiped) { swiped = false; return; }
      if (e.target === lb || e.target === lb.querySelector('.lb__fig')) shut();
    });
  }

  // "Let us call you" form: sends the request as a text message to Alexon
  const form = document.getElementById('quote');
  if (form) {
    const f = form.elements;

    document.querySelectorAll('[data-service]').forEach((a) =>
      a.addEventListener('click', () => { f.service.value = a.dataset.service; })
    );

    f.phone.addEventListener('input', () => f.phone.setCustomValidity(''));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const digits = f.phone.value.replace(/\D/g, '');
      f.phone.setCustomValidity(digits.length >= 10 ? '' : 'Please enter a 10-digit phone number.');
      if (!form.reportValidity()) return;

      const msg = [
        'Hi Alexon, please call me back.',
        'Name: ' + f.who.value.trim(),
        'Phone: ' + f.phone.value.trim(),
        f.service.value && 'Type of work: ' + f.service.value,
        f.area.value.trim() && 'Area: ' + f.area.value.trim(),
        f.details.value.trim(),
      ].filter(Boolean).join('\n');

      location.href = 'sms:' + PHONE + '?&body=' + encodeURIComponent(msg);
      form.querySelector('.form__done').hidden = false;
    });
  }
})();
