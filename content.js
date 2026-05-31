// Zen AI Summarizer Content Script

let shadowRoot = null;
let panelContainer = null;

// Initialize the overlay
function createOverlay() {
  if (panelContainer) return;

  // Create container div that will hold the Shadow DOM
  panelContainer = document.createElement("div");
  panelContainer.id = "zen-ai-summarizer-container";
  panelContainer.style.position = "fixed";
  panelContainer.style.top = "0";
  panelContainer.style.right = "0";
  panelContainer.style.width = "0";
  panelContainer.style.height = "100vh";
  panelContainer.style.zIndex = "2147483647"; // Max z-index
  document.body.appendChild(panelContainer);

  // Attach Shadow DOM for style isolation
  shadowRoot = panelContainer.attachShadow({ mode: "open" });

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    :host {
      --primary: #8b5cf6;
      --primary-hover: #7c3aed;
      --primary-glow: rgba(139, 92, 246, 0.3);
      --bg: rgba(15, 15, 22, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --card-bg: rgba(255, 255, 255, 0.03);
      --error: #ef4444;
      --success: #10b981;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .panel {
      position: fixed;
      top: 0;
      right: -420px;
      width: 400px;
      height: 100vh;
      background: var(--bg);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-left: 1px solid var(--border);
      box-shadow: -10px 0 35px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--text);
      transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2147483647;
    }

    .panel.open {
      right: 0;
    }

    /* Header styling */
    .header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.01);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand svg {
      width: 24px;
      height: 24px;
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 700;
      background: linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-icon {
      background: none;
      border: 1px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .btn-icon:hover {
      color: var(--text);
      background: var(--border);
      border-color: rgba(255, 255, 255, 0.05);
      transform: translateY(-1px);
    }

    .btn-icon:active {
      transform: translateY(0);
    }

    /* Content Area */
    .content-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      line-height: 1.6;
      font-size: 0.95rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
    }

    .content-body::-webkit-scrollbar {
      width: 6px;
    }
    .content-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .source-info {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 20px;
      padding: 10px 12px;
      background: var(--card-bg);
      border-radius: 8px;
      border: 1px solid var(--border);
      word-break: break-all;
    }

    .source-info strong {
      color: var(--text);
      display: block;
      margin-bottom: 4px;
      font-size: 0.85rem;
    }

    /* Markdown output styles */
    .summary-text {
      color: #f3f4f6;
      font-size: 0.95rem;
      line-height: 1.65;
    }

    .summary-text p {
      margin-bottom: 16px;
      color: #e2e8f0;
      text-align: justify;
    }

    .summary-text h1, 
    .summary-text h2, 
    .summary-text h3, 
    .summary-text h4 {
      color: #ffffff;
      font-weight: 700;
      line-height: 1.35;
      margin-top: 24px;
      margin-bottom: 12px;
    }

    .summary-text h1 { font-size: 1.45rem; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    .summary-text h2 { font-size: 1.3rem; }
    .summary-text h3 { font-size: 1.15rem; border-left: 3px solid var(--primary); padding-left: 8px; }
    .summary-text h4 { font-size: 1.05rem; color: var(--text-muted); }

    .summary-text ul, 
    .summary-text ol {
      margin-bottom: 18px;
      padding-left: 20px;
    }

    .summary-text li {
      margin-bottom: 8px;
      color: #e2e8f0;
    }

    .summary-text li::marker {
      color: var(--primary);
    }

    .summary-text strong {
      color: #ffffff;
      font-weight: 600;
    }

    .summary-text blockquote {
      border-left: 4px solid var(--primary);
      background: rgba(139, 92, 246, 0.04);
      padding: 12px 16px;
      margin: 18px 0;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: #cbd5e1;
    }

    .summary-text code {
      font-family: 'Fira Code', 'Courier New', Courier, monospace;
      font-size: 0.85rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: #f472b6;
    }

    .summary-text pre {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      overflow-x: auto;
      margin: 18px 0;
    }

    .summary-text pre code {
      background: none;
      padding: 0;
      color: #f3f4f6;
      font-size: 0.85rem;
    }

    /* Loader */
    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      gap: 16px;
    }

    .spinner {
      position: relative;
      width: 48px;
      height: 48px;
    }

    .spinner::before, .spinner::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      inset: 0;
      border: 3px solid transparent;
      border-top-color: var(--primary);
      animation: spin 1s linear infinite;
    }

    .spinner::after {
      margin: 6px;
      border-top-color: #f472b6;
      animation: spin 1.5s linear infinite reverse;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loader-text {
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    /* Error and Missing API state */
    .error-container {
      padding: 16px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
      color: #fca5a5;
      font-size: 0.9rem;
      margin-top: 10px;
    }

    .error-title {
      font-weight: 600;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--error);
    }

    .btn-action {
      display: block;
      width: 100%;
      padding: 10px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
      text-align: center;
    }

    .btn-action:hover {
      background: var(--primary-hover);
    }
  `;

  shadowRoot.appendChild(style);

  // Create Panel elements
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <div class="header">
      <div class="brand">
        <!-- SVG Sparkle Icon -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke-linecap="round" opacity="0.5"/>
          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6Z" stroke="url(#logoGrad)" />
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3b82f6" />
              <stop offset="50%" stop-color="#8b5cf6" />
              <stop offset="100%" stop-color="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        <span class="brand-title">Zen AI Summary</span>
      </div>
      <div class="controls">
        <button id="copy-btn" class="btn-icon" title="Özeti Kopyala">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </button>
        <button id="settings-btn" class="btn-icon" title="Ayarlar">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button id="close-btn" class="btn-icon" title="Kapat">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    <div id="content-body" class="content-body">
      <div id="loader" class="loader-container" style="display: none;">
        <div class="spinner"></div>
        <div id="loader-status" class="loader-text">İçerik analiz ediliyor...</div>
      </div>
      <div id="result-container">
        <div id="source-banner" class="source-info" style="display: none;">
          <strong id="source-title">Sayfa Başlığı</strong>
          <span id="source-url">URL</span>
        </div>
        <div id="summary-output" class="summary-text"></div>
      </div>
    </div>
  `;

  shadowRoot.appendChild(panel);

  // Set up event listeners
  shadowRoot.getElementById("close-btn").addEventListener("click", hideOverlay);
  shadowRoot.getElementById("settings-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "open_options" });
  });

  const copyBtn = shadowRoot.getElementById("copy-btn");
  copyBtn.addEventListener("click", async () => {
    const summaryText = shadowRoot.getElementById("summary-output").innerText;
    if (!summaryText) return;

    try {
      await navigator.clipboard.writeText(summaryText);
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
      }, 2000);
    } catch (err) {
      console.error("Metin kopyalanamadı:", err);
    }
  });
}

// Show the overlay panel
function showOverlay() {
  createOverlay();
  
  // Make container visible
  panelContainer.style.width = "400px";
  
  // Push panel into view
  setTimeout(() => {
    const panel = shadowRoot.querySelector(".panel");
    panel.classList.add("open");
  }, 10);
}

// Hide the overlay panel
function hideOverlay() {
  if (!panelContainer) return;
  
  const panel = shadowRoot.querySelector(".panel");
  panel.classList.remove("open");
  
  // Remove container after transition finishes
  setTimeout(() => {
    panelContainer.style.width = "0";
  }, 400);
}

// Set loader state
function showLoader(message = "Analiz ediliyor...") {
  showOverlay();
  shadowRoot.getElementById("loader").style.display = "flex";
  shadowRoot.getElementById("loader-status").textContent = message;
  shadowRoot.getElementById("result-container").style.display = "none";
}

// Hide loader state
function hideLoader() {
  if (!shadowRoot) return;
  shadowRoot.getElementById("loader").style.display = "none";
  shadowRoot.getElementById("result-container").style.display = "block";
}

// Display Summary or Errors
function displayResult({ title, url, summaryHtml, error, isApiKeyMissing = false }) {
  hideLoader();

  const sourceBanner = shadowRoot.getElementById("source-banner");
  const summaryOutput = shadowRoot.getElementById("summary-output");

  if (title && url) {
    sourceBanner.style.display = "block";
    shadowRoot.getElementById("source-title").textContent = title;
    shadowRoot.getElementById("source-url").textContent = url;
  } else {
    sourceBanner.style.display = "none";
  }

  if (error) {
    if (isApiKeyMissing) {
      summaryOutput.innerHTML = `
        <div class="error-container">
          <div class="error-title">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            API Anahtarı Eksik
          </div>
          API anahtarı ayarlanmamış. Eklentiyi kullanabilmek için lütfen seçenekler sayfasından geçerli bir API anahtarı tanımlayın.
          <button id="error-settings-btn" class="btn-action">Ayarları Aç</button>
        </div>
      `;
      shadowRoot.getElementById("error-settings-btn").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "open_options" });
      });
    } else {
      summaryOutput.innerHTML = `
        <div class="error-container">
          <div class="error-title">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>
            </svg>
            Hata Oluştu
          </div>
          ${error}
        </div>
      `;
    }
  } else {
    summaryOutput.innerHTML = summaryHtml;
  }
}

// Extract main text content of the active page
function extractPageText() {
  const title = document.title || "Mevcut Sayfa";
  const url = window.location.href;
  
  // Clone to avoid breaking original page elements
  const bodyClone = document.body.cloneNode(true);
  
  // Remove interactive and structural elements we don't want summarized
  const elementsToRemove = bodyClone.querySelectorAll(
    "script, style, nav, footer, header, iframe, noscript, svg, select, option, button, [role='banner'], [role='navigation']"
  );
  elementsToRemove.forEach(el => el.remove());
  
  // Try to find structural tags, otherwise use whole document
  const mainContent = bodyClone.querySelector("article") || bodyClone.querySelector("main") || bodyClone;
  
  let text = mainContent.innerText || mainContent.textContent || "";
  
  // Clean whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return {
    title,
    url,
    text: text.slice(0, 50000) // Send max 50k chars (handles larger documents)
  };
}

// Custom Markdown Parser
function parseMarkdown(markdown) {
  if (!markdown) return "";
  
  // Escape HTML tags to prevent XSS
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (```code```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers (#### Header to # Header)
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Bold (**bold** or __bold__)
  html = html.replace(/\*\*(?!\s)([\s\S]*?)(?<!\s)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(?!\s)([\s\S]*?)(?<!\s)__/g, "<strong>$1</strong>");
  
  // Italic (*italic* or _italic_)
  html = html.replace(/\*(?!\s)([\s\S]*?)(?<!\s)\*/g, "<em>$1</em>");
  html = html.replace(/_(?!\s)([\s\S]*?)(?<!\s)_/g, "<em>$1</em>");

  // Blockquotes (> text)
  html = html.replace(/^&gt;\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // Format list items (unordered & ordered)
  const lines = html.split("\n");
  const resultLines = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Unordered lists
    if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("+ ")) {
      if (inOl) {
        resultLines.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        resultLines.push("<ul>");
        inUl = true;
      }
      resultLines.push(`<li>${line.substring(2)}</li>`);
    } 
    // Ordered lists (e.g. 1. Item)
    else if (/^\d+\.\s+/.test(line)) {
      if (inUl) {
        resultLines.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        resultLines.push("<ol>");
        inOl = true;
      }
      const content = line.replace(/^\d+\.\s+/, "");
      resultLines.push(`<li>${content}</li>`);
    } 
    // Plain line
    else {
      if (inUl) {
        resultLines.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        resultLines.push("</ol>");
        inOl = false;
      }
      resultLines.push(lines[i]); // Keep original formatting line
    }
  }
  
  if (inUl) resultLines.push("</ul>");
  if (inOl) resultLines.push("</ol>");

  html = resultLines.join("\n");

  // Split into paragraphs (avoid wrapping lists, headers, blocks in paragraphs)
  html = html.split(/\n{2,}/).map(p => {
    p = p.trim();
    if (!p) return "";
    if (
      p.startsWith("<h") || 
      p.startsWith("<ul") || 
      p.startsWith("<ol") || 
      p.startsWith("<li") || 
      p.startsWith("<pre") || 
      p.startsWith("<blockquote")
    ) {
      return p;
    }
    return `<p>${p}</p>`;
  }).join("");

  return html;
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize_page") {
    // Start page summarization
    const pageData = extractPageText();
    
    if (pageData.text.length < 50) {
      showOverlay();
      displayResult({
        error: "Sayfada özetlenebilecek yeterli metin bulunamadı. Sayfa boş olabilir.",
        title: pageData.title,
        url: pageData.url
      });
      return;
    }

    showLoader("Sayfa içeriği analiz ediliyor...");

    // Send text to background script to call Gemini API
    chrome.runtime.sendMessage({
      action: "summarize_current_page_text",
      text: pageData.text,
      title: pageData.title
    }, (response) => {
      if (!response) {
        displayResult({ error: "Arka plan servisi ile iletişim kurulamadı." });
        return;
      }
      if (response.success) {
        const summaryHtml = parseMarkdown(response.summary);
        displayResult({
          title: pageData.title,
          url: pageData.url,
          summaryHtml: summaryHtml
        });
      } else {
        const isMissing = response.error && response.error.includes("API_KEY_MISSING");
        displayResult({
          error: isMissing ? null : response.error,
          isApiKeyMissing: isMissing,
          title: pageData.title,
          url: pageData.url
        });
      }
    });
  }

  if (request.action === "summarize_link_start") {
    // Started summarization of a clicked link
    showLoader("Bağlantı içeriği indiriliyor ve analiz ediliyor...");
    
    // Set temp title and show overlay
    const urlObj = new URL(request.url);
    const domain = urlObj.hostname;
    
    // In progress display
    const sourceBanner = shadowRoot.getElementById("source-banner");
    sourceBanner.style.display = "block";
    shadowRoot.getElementById("source-title").textContent = "Bağlantı Yükleniyor...";
    shadowRoot.getElementById("source-url").textContent = request.url;
  }

  if (request.action === "summarize_link_success") {
    // Successfully summarized the link content
    const summaryHtml = parseMarkdown(request.summary);
    displayResult({
      title: request.title,
      url: request.url,
      summaryHtml: summaryHtml
    });
  }

  if (request.action === "summarize_link_error") {
    // Failed to summarize link
    const isMissing = request.error && request.error.includes("API_KEY_MISSING");
    displayResult({
      error: isMissing ? null : request.error,
      isApiKeyMissing: isMissing
    });
  }
});
