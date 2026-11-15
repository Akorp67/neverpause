// Watches the chat box, and before you hit enter, tells you if the prompt
// looks like a job for Claude Code.

(function () {
  if (window.__codeNudgeLoaded) return;
  window.__codeNudgeLoaded = true;

  const CLAUDE_CODE_URL = "https://claude.ai/code";
  const storage = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) || null;

  let settings = { enabled: true, showMaybe: true };
  let activeEl = null;
  let lastResult = null;
  let dismissedScore = null;
  let shownForThisPrompt = false;
  let timer = null;

  if (storage) {
    storage.get(["enabled", "showMaybe"], (s) => {
      if (typeof s.enabled === "boolean") settings.enabled = s.enabled;
      if (typeof s.showMaybe === "boolean") settings.showMaybe = s.showMaybe;
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) settings.enabled = changes.enabled.newValue;
      if (changes.showMaybe) settings.showMaybe = changes.showMaybe.newValue;
      if (!settings.enabled) hide();
    });
  }

  function bump(key) {
    if (!storage) return;
    storage.get([key], (s) => storage.set({ [key]: (s[key] || 0) + 1 }));
  }

  // ---------- The card (in a shadow root so the site's CSS can't touch it) ----------
  const host = document.createElement("div");
  host.id = "code-nudge-host";
  host.style.cssText = "position:fixed;z-index:2147483647;display:none;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .card {
        font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #1f1e1d; color: #f5f2ee;
        border: 1px solid #d97757; border-radius: 12px;
        padding: 12px 14px; box-shadow: 0 8px 24px rgba(0,0,0,.25);
        max-width: 440px;
      }
      .card.maybe { border-color: #8a8580; }
      .top { display: flex; align-items: center; gap: 8px; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #d97757; flex: none; }
      .maybe .dot { background: #b5afa8; }
      .title { font-weight: 600; flex: 1; }
      .x { background: none; border: 0; color: #b5afa8; cursor: pointer; font-size: 16px; padding: 0 2px; }
      .tip { margin: 6px 0 0; color: #d9d4ce; }
      ul { margin: 8px 0 0; padding-left: 18px; color: #b5afa8; font-size: 13px; }
      ul[hidden] { display: none; }
      .row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
      button.btn {
        font: inherit; font-size: 13px; border-radius: 8px; padding: 6px 10px; cursor: pointer;
        border: 1px solid #4a4744; background: #2c2a28; color: #f5f2ee;
      }
      button.primary { background: #d97757; border-color: #d97757; color: #1f1e1d; font-weight: 600; }
      button.btn:hover { filter: brightness(1.1); }
      .done { font-size: 13px; color: #9fd3a8; margin-top: 8px; }
    </style>
    <div class="card" part="card">
      <div class="top">
        <span class="dot"></span>
        <span class="title"></span>
        <button class="x" title="Hide for this prompt">&times;</button>
      </div>
      <p class="tip"></p>
      <ul hidden></ul>
      <div class="row">
        <button class="btn primary open">Open in Claude Code</button>
        <button class="btn why">Why?</button>
        <button class="btn stay">Keep it in chat</button>
      </div>
      <div class="done" hidden>Prompt copied. Paste it into Claude Code.</div>
    </div>`;
  const $ = (s) => shadow.querySelector(s);

  $(".x").addEventListener("click", dismiss);
  $(".stay").addEventListener("click", () => { bump("keptInChat"); dismiss(); });
  $(".why").addEventListener("click", () => {
    const ul = $("ul");
    ul.hidden = !ul.hidden;
    $(".why").textContent = ul.hidden ? "Why?" : "Hide why";
    position();
  });
  $(".open").addEventListener("click", async () => {
    const text = getText(activeEl);
    try { await navigator.clipboard.writeText(text); } catch (e) { fallbackCopy(text); }
    bump("openedInCode");
    $(".done").hidden = false;
    window.open(CLAUDE_CODE_URL, "_blank", "noopener");
  });

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }

  function dismiss() {
    dismissedScore = lastResult ? lastResult.score : 0;
    hide();
  }

  function hide() { host.style.display = "none"; }

  function show(result) {
    const card = $(".card");
    card.classList.toggle("maybe", result.verdict === "maybe");
    $(".title").textContent = result.verdict === "code"
      ? "This is a job for Claude Code"
      : "This might be a job for Claude Code";
    $(".tip").textContent = result.tip || "Claude Code can do the work in your files, not just talk about it.";
    const ul = $("ul");
    ul.innerHTML = "";
    for (const r of result.reasons) {
      const li = document.createElement("li");
      li.textContent = r;
      ul.appendChild(li);
    }
    $(".done").hidden = true;
    if (!document.documentElement.contains(host)) document.documentElement.appendChild(host);
    host.style.display = "block";
    if (!shownForThisPrompt) { shownForThisPrompt = true; bump("nudgesShown"); }
    position();
  }

  function position() {
    if (!activeEl || host.style.display === "none") return;
    const r = activeEl.getBoundingClientRect();
    const width = Math.min(440, Math.max(260, r.width));
    host.style.width = width + "px";
    host.style.left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) + "px";
    const h = host.offsetHeight || 140;
    // Sit above the box. If there's no room, sit below it.
    const top = r.top - h - 10 >= 8 ? r.top - h - 10 : r.bottom + 10;
    host.style.top = top + "px";
  }

  // ---------- Reading the chat box ----------
  function findEditable(node) {
    if (!node || node.nodeType !== 1) return null;
    if (node.tagName === "TEXTAREA") return node;
    return node.closest('[contenteditable="true"], [contenteditable=""]');
  }

  function getText(el) {
    if (!el) return "";
    return el.tagName === "TEXTAREA" ? el.value : el.innerText;
  }

  function check() {
    if (!settings.enabled || !activeEl) return hide();
    const text = getText(activeEl);
    if (!text.trim()) {
      // Box is empty again (sent or cleared), so start fresh.
      dismissedScore = null;
      shownForThisPrompt = false;
      lastResult = null;
      return hide();
    }
    const result = self.CodeNudge.classify(text);
    lastResult = result;
    const wanted = result.verdict === "code" || (result.verdict === "maybe" && settings.showMaybe);
    if (!wanted) return hide();
    if (dismissedScore !== null && result.score <= dismissedScore) return hide();
    dismissedScore = null;
    show(result);
  }

  function onInput(e) {
    const el = findEditable(e.target);
    if (!el) return;
    activeEl = el;
    clearTimeout(timer);
    timer = setTimeout(check, 350);
  }

  document.addEventListener("input", onInput, true);
  document.addEventListener("paste", (e) => setTimeout(() => onInput(e), 0), true);
  // Some editors clear the box on send without firing "input".
  document.addEventListener("keyup", (e) => { if (e.key === "Enter") onInput(e); }, true);
  window.addEventListener("resize", position);
  window.addEventListener("scroll", position, true);
})();
