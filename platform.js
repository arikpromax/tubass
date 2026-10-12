/* ============================================================
   Alexon ↔ admin panel (arawebsite platform, Supabase).

   The site works on its own without the database: the HTML already
   holds every text and photo. As soon as SITE has the site's number,
   this file fills the marked places with what the owner wrote in the
   admin panel:

     data-txt="key"      a text (line breaks stay line breaks)
     data-head="key"     a big heading, one line of the field = one line
     data-show="key"     hidden while the field is empty
     data-link="key"     a link (Facebook, Instagram…)
     data-mail="key"     an email link
     data-photo="slot"   a photo place from «Site photos»
     data-list="…"       a list rebuilt from cards (jobs, photos, FAQ…)
     tel: / sms: links   all follow the one phone field

   Order on the page: platform.js → script.js. What the browser kept
   from the last visit is applied at once; fresh data replaces it a
   second later. No database — the site stays as it is.
   ============================================================ */
(function () {
  'use strict';

  // Site number in the admin panel. 0 = not connected yet, the site lives on its HTML.
  var SITE = 0;

  var A = (window.ALEXON = window.ALEXON || {});
  if (!SITE) return;

  var DB = 'https://ortiatyxntdikaldepbp.supabase.co/rest/v1';
  var KEY = 'sb_publishable_UW1Z8ukEU1XWVCdQxIGkDw_firK4hpO'; /* public read-only key */
  var NL = String.fromCharCode(10);

  var get = function (path) {
    return fetch(DB + path, { headers: { apikey: KEY } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)); });
  };
  var each = function (sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); };
  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var lines = function (t) { return String(t || '').split(NL).map(function (s) { return s.trim(); }).filter(Boolean); };
  var multi = function (t) { return lines(t).map(esc).join('<br>'); };
  // {phone} in any text = the phone field, so answers that mention the number follow it too
  var PH = '';
  var tok = function (t) { return String(t == null ? '' : t).split('{phone}').join(PH); };
  var byCol = function (rows) {
    var m = {};
    (rows || []).forEach(function (r) { (m[r.collection] = m[r.collection] || []).push(r); });
    return m;
  };

  /* ---------- simple texts ---------- */
  var paintTexts = function (T) {
    var has = function (k) { return Object.prototype.hasOwnProperty.call(T, k); };

    each('[data-txt]', function (el) {
      var k = el.getAttribute('data-txt');
      if (!has(k)) return;
      var v = tok(T[k]);
      if (v.indexOf(NL) > -1) el.innerHTML = multi(v);
      else el.textContent = v;
    });

    each('[data-head]', function (el) {
      var k = el.getAttribute('data-head');
      if (!has(k) || !lines(T[k]).length) return;
      el.innerHTML = lines(T[k]).map(function (l) { return '<span class="ln"><span>' + esc(l) + '</span></span>'; }).join('');
    });

    // footer line "Handyman · Renovation · Painting" = the lines of the services heading
    if (has('svc_h') && lines(T.svc_h).length) each('[data-tagline]', function (el) { el.textContent = lines(T.svc_h).join(' · '); });

    each('[data-show]', function (el) {
      var k = el.getAttribute('data-show');
      if (has(k)) el.hidden = !String(T[k] || '').trim();
    });

    each('[data-link]', function (el) {
      var v = String(T[el.getAttribute('data-link')] || '').trim();
      if (!v) return;
      el.href = v;
      var label = el.getAttribute('data-label');
      if (label) el.textContent = label;
    });

    each('[data-mail]', function (el) {
      var v = String(T[el.getAttribute('data-mail')] || '').trim();
      if (!v) return;
      el.textContent = v;
      el.href = 'mailto:' + v;
    });

    // one phone field → every call and text link on the page
    if (has('phone') && String(T.phone).trim()) {
      var d = String(T.phone).replace(/\D/g, '');
      if (d.length === 10) d = '1' + d;
      A.tel = '+' + d;
      each('a[href^="tel:"]', function (el) { el.href = 'tel:' + A.tel; });
      each('a[href^="sms:"]', function (el) { el.href = 'sms:' + A.tel; });
    }
  };

  /* ---------- photo places ---------- */
  var paintPhotos = function (rows) {
    (rows || []).forEach(function (r) {
      var slot = (r.extra || {}).slot;
      if (!slot || !r.image_url) return;
      each('[data-photo="' + slot + '"] img', function (img) { img.src = r.image_url; });
    });
  };

  /* ---------- services: tiles, menus, footer and the service pages ---------- */
  var paintServices = function (rows) {
    (rows || []).forEach(function (r) {
      var x = r.extra || {};
      var slug = x.key;
      if (!slug) return;
      var href = '[href="' + slug + '.html"]';

      each('a.svc__item' + href, function (a) {
        if (r.title) a.querySelector('.svc__name').textContent = r.title;
        if (x.note != null) a.querySelector('.svc__note').textContent = x.note;
        var ph = a.querySelector('.svc__ph');
        if (r.image_url) {
          ph.classList.remove('svc__ph--icon');
          var img = ph.querySelector('img');
          if (!img) { ph.innerHTML = '<img alt="" loading="lazy" decoding="async">'; img = ph.querySelector('img'); }
          img.src = r.image_url;
          img.removeAttribute('style');
        } else if (ph.querySelector('img')) {
          var icon = a.querySelector('.svc__badge use');
          ph.classList.add('svc__ph--icon');
          ph.innerHTML = '<svg class="ic"><use href="' + (icon ? icon.getAttribute('href') : '') + '"/></svg>';
        }
      });
      each('a.dd__item' + href, function (a) {
        if (r.title) a.querySelector('b').textContent = r.title;
        if (x.note != null) a.querySelector('small').textContent = x.note;
      });
      if (r.title) {
        each('.mnav__svc a' + href + ', .foot__links a' + href, function (a) { a.textContent = r.title; });
        each('option[data-svc="' + slug + '"]', function (o) { o.textContent = r.title; });
      }

      var page = document.querySelector('[data-svc-page="' + slug + '"]');
      if (!page) return;
      if (r.title) each('[data-svc-name]', function (el) { el.textContent = r.title; }, page);
      if (x.sub != null) each('[data-svc-sub]', function (el) { el.textContent = x.sub; }, page);
      if (r.text) each('[data-svc-lead]', function (el) { el.textContent = r.text; }, page);
      var list = page.querySelector('[data-list="svc-rows"]');
      if (list && lines(x.list).length) {
        list.innerHTML = lines(x.list).map(function (l) {
          var at = l.search(/\s[—–-]\s/);
          var t = at > -1 ? l.slice(0, at) : l;
          var d = at > -1 ? l.slice(at + 3) : '';
          return '<li class="rows__item"><h3 class="rows__t">' + esc(t) + '</h3><p class="rows__d">' + esc(d) + '</p></li>';
        }).join('');
      }
      var shots = page.querySelector('[data-list="svc-photos"]');
      var pics = Array.isArray(x.photos) ? x.photos.filter(Boolean) : [];
      if (shots && pics.length) {
        shots.innerHTML = pics.map(function (u) { return '<figure class="shot"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async"></figure>'; }).join('');
      }
    });
  };

  /* ---------- before & after jobs ---------- */
  var paintJobs = function (rows) {
    var box = document.querySelector('[data-list="jobs"]');
    if (!box) return;
    var jobs = (rows || []).filter(function (r) { return r.image_url && (r.extra || {}).before; });
    var section = box.closest('section');
    if (section) section.hidden = !jobs.length;
    if (!jobs.length) return;
    box.innerHTML = jobs.map(function (r, i) {
      var x = r.extra || {};
      var facts = lines(x.facts).map(function (l) {
        var at = l.indexOf(':');
        return at > -1
          ? '<div><dt>' + esc(l.slice(0, at)) + '</dt><dd>' + esc(l.slice(at + 1).trim()) + '</dd></div>'
          : '<div><dt></dt><dd>' + esc(l) + '</dd></div>';
      }).join('');
      return '<article class="proj' + (i ? '' : ' is-on') + '" data-before="' + esc(x.before) + '" data-after="' + esc(r.image_url) + '"' +
        (x.flip === true || x.flip === 'true' ? ' data-flip' : '') + '>' +
        '<h3 class="proj__t">' + esc(r.title) + '</h3>' +
        (r.text ? '<p class="proj__d">' + esc(r.text) + '</p>' : '') +
        (facts ? '<dl class="proj__facts">' + facts + '</dl>' : '') + '</article>';
    }).join('');
  };

  /* ---------- "What we do best" photo cards ---------- */
  var paintBest = function (rows) {
    var grid = document.querySelector('[data-list="best"]');
    if (!grid) return;
    var cards = (rows || []).filter(function (r) { return r.image_url; });
    var section = grid.closest('section');
    if (section) section.hidden = !cards.length;
    grid.innerHTML = cards.map(function (r) {
      var big = (r.extra || {}).big === true || (r.extra || {}).big === 'true';
      return '<a class="card' + (big ? ' card--lg' : '') + '" href="' + esc(r.image_url) + '">' +
        '<img src="' + esc(r.image_url) + '" alt="' + esc(r.title) + '" loading="lazy" decoding="async">' +
        '<span class="card__body"><span class="card__t">' + esc(r.title) + '</span>' +
        (r.text ? '<span class="card__d">' + esc(r.text) + '</span>' : '') + '</span></a>';
    }).join('');
  };

  /* ---------- why Alexon ---------- */
  var paintWhy = function (rows) {
    var list = document.querySelector('[data-list="why"]');
    if (!list) return;
    list.hidden = !(rows || []).length;
    list.innerHTML = (rows || []).map(function (r) {
      return '<li class="rows__item"><h3 class="rows__t">' + esc(r.title) + '</h3><p class="rows__d">' + multi(tok(r.text)) + '</p></li>';
    }).join('');
  };

  /* ---------- questions ---------- */
  var paintFaq = function (rows) {
    var list = document.querySelector('[data-list="faq"]');
    if (!list) return;
    var section = list.closest('section');
    if (section) section.hidden = !(rows || []).length;
    list.innerHTML = (rows || []).map(function (r) {
      return '<details class="faq__item"><summary>' + esc(r.title) + '</summary><p>' + multi(tok(r.text)) + '</p></details>';
    }).join('');
  };

  /* ---------- everything at once ---------- */
  var applyAll = function (items, texts, live) {
    var T = {};
    (texts || []).forEach(function (r) { T[r.key] = r.value; });
    PH = String(T.phone || '').trim();
    var by = byCol(items);

    paintServices(by.services);
    paintJobs(by.jobs);
    paintBest(by.best);
    paintWhy(by.why);
    paintFaq(by.faq);
    paintPhotos(by.site_photos);
    paintTexts(T);

    A.reviews = {
      profile: T.google || '',
      write: T.rev_write || '',
      rating: T.rev_rating ? Number(String(T.rev_rating).replace(',', '.')) || null : null,
      count: T.rev_count ? Number(String(T.rev_count).replace(/\D/g, '')) || null : null,
      reviews: (by.reviews || []).map(function (r) { return { name: r.title, place: (r.extra || {}).place || '', text: r.text }; }),
    };

    // script.js already bound the sliders and cards — let it pick up the new ones
    if (live && typeof A.refresh === 'function') A.refresh();
  };

  /* ---------- the browser's memory of the last visit ---------- */
  var BOX = 'alexon_cms_' + SITE;
  var OLD = 7 * 24 * 3600 * 1000;
  var remember = function (items, texts) {
    try { localStorage.setItem(BOX, JSON.stringify({ at: Date.now(), items: items, texts: texts })); } catch (e) { /* storage full or blocked */ }
  };
  var recall = function () {
    try {
      var b = JSON.parse(localStorage.getItem(BOX) || 'null');
      return b && b.at && Date.now() - b.at < OLD ? b : null;
    } catch (e) { return null; }
  };

  var box = recall();
  if (box) applyAll(box.items, box.texts, false);

  Promise.all([
    get('/items?site_id=eq.' + SITE + '&order=collection,sort_order,id&select=collection,title,text,image_url,extra'),
    get('/texts?site_id=eq.' + SITE + '&select=key,value'),
  ]).then(function (r) {
    var same = box && JSON.stringify(box.items) === JSON.stringify(r[0]) && JSON.stringify(box.texts) === JSON.stringify(r[1]);
    remember(r[0], r[1]);
    if (!same) applyAll(r[0], r[1], true);
  }).catch(function () { /* no database right now — the page stays as it is */ });
})();
