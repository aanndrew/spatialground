
/* SpatialGround V1.3: show one retrieval timestamp in UTC and in the visitor's browser time zone. */
(() => {
  const utcEl = document.getElementById('ew-updated-utc');
  const localEl = document.getElementById('ew-updated-local');
  const statusEl = document.getElementById('ew-updated');
  if (!utcEl || !localEl || !statusEl) return;
  let currentISO = '';
  const utcFmt = new Intl.DateTimeFormat('en-GB', { timeZone:'UTC', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
  const localFmt = new Intl.DateTimeFormat('en-US', { day:'2-digit', month:'short', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true, timeZoneName:'short' });
  function render(iso) {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return;
    const u = `${utcFmt.format(d)} UTC`;
    const l = localFmt.format(d);
    utcEl.textContent = u;
    localEl.textContent = l;
    utcEl.setAttribute('datetime', d.toISOString());
    localEl.setAttribute('datetime', d.toISOString());
    currentISO = d.toISOString();
    statusEl.textContent = 'Last retrieved';
  }
  function setPending() {
    utcEl.textContent = '—'; localEl.textContent = '—';
    utcEl.removeAttribute('datetime'); localEl.removeAttribute('datetime');
    currentISO = '';
  }
  let internal = false;
  function syncFromStatus() {
    if (internal) return;
    const value = (statusEl.textContent || '').trim();
    if (/demo|illustrative|sample/i.test(value)) {setPending();return;}
    if (/retrieved/i.test(value) && value !== 'Last retrieved') {
      const candidate = value.replace(/^retrieved\s*/i,'').trim();
      const n = Date.parse(candidate);
      if (Number.isFinite(n)) {
        internal = true;
        render(new Date(n).toISOString());
        queueMicrotask(() => { internal=false; });
      }
    }
  }
  // Source timestamp is sent directly from the existing dashboard's fetch response.
  document.addEventListener('ew:feed-retrieved', (evt) => {
    const raw = evt?.detail?.iso;
    if (typeof raw === 'string') { internal = true; render(raw); queueMicrotask(() => { internal=false; }); }
  });
  const observer = new MutationObserver(syncFromStatus);
  observer.observe(statusEl,{childList:true,characterData:true,subtree:true});
  syncFromStatus();
})();
