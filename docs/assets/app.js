// Two modes:
// - src/handbook.html (local preview): plain content, just wire the tabs.
// - docs/index.html (published): the content is AES-GCM ciphertext; decrypt it with the
//   password, then wire the tabs. Without the password the page holds nothing readable.
(function () {
  function initTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    var ids = tabs.map(function (t) { return t.getAttribute('aria-controls'); });

    function show(id) {
      if (ids.indexOf(id) < 0) id = ids[0];
      tabs.forEach(function (t) {
        var on = t.getAttribute('aria-controls') === id;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        var id = t.getAttribute('aria-controls');
        if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
        show(id);
        window.scrollTo(0, 0);
      });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var next = tabs[(i + d + tabs.length) % tabs.length];
        next.click();
        next.focus();
      });
    });

    // In-page links like <a href="#linking"> switch tabs too.
    window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
    show(location.hash.slice(1));
    window.scrollTo(0, 0);
  }

  var payloadEl = document.getElementById('payload');
  if (!payloadEl) { initTabs(); return; }

  var P = JSON.parse(payloadEl.textContent);
  var STORE = 'mycall-handbook-key';
  var subtle = window.crypto && window.crypto.subtle;
  var form = document.getElementById('gate');
  var input = document.getElementById('gate-pw');
  var msg = document.getElementById('gate-msg');

  function bytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }

  function keyFromPassword(pw) {
    return subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return subtle.deriveKey(
          { name: 'PBKDF2', hash: 'SHA-256', salt: bytes(P.salt), iterations: P.iter },
          base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
      });
  }

  // Hypothesis annotation client (comments like a doc). Loaded only after decryption, because
  // replacing <body> would wipe its sidebar, and it must see the real text to anchor notes.
  function loadAnnotations() {
    if (document.querySelector('script[data-annotations]')) return;
    window.hypothesisConfig = function () { return { openSidebar: false, showHighlights: 'always' }; };
    var s = document.createElement('script');
    s.src = 'https://hypothes.is/embed.js';
    s.async = true;
    s.setAttribute('data-annotations', '');
    document.head.appendChild(s);
  }

  function unlock(key) {
    return subtle.decrypt({ name: 'AES-GCM', iv: bytes(P.iv) }, key, bytes(P.ct)).then(function (plain) {
      document.body.innerHTML = new TextDecoder().decode(plain);
      initTabs();
      loadAnnotations();
      return key;
    });
  }

  function remember(key) {
    // sessionStorage: stays for this browser tab session only, never written to disk long-term.
    return subtle.exportKey('raw', key).then(function (raw) {
      try { sessionStorage.setItem(STORE, btoa(String.fromCharCode.apply(null, new Uint8Array(raw)))); } catch (e) {}
    });
  }

  if (!subtle) {
    msg.textContent = '浏览器不支持解密，请用最新版 Chrome、Edge 或 Safari 打开。';
    return;
  }

  var saved = null;
  try { saved = sessionStorage.getItem(STORE); } catch (e) {}
  if (saved) {
    subtle.importKey('raw', bytes(saved), 'AES-GCM', true, ['decrypt']).then(unlock)
      .catch(function () { try { sessionStorage.removeItem(STORE); } catch (e) {} });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.textContent = '正在解密…';
    keyFromPassword(input.value).then(unlock).then(remember).catch(function () {
      msg.textContent = '密码不正确，请重试。';
      input.select();
    });
  });
  input.focus();
})();
