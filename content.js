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
  panelContainer.style.pointerEvents = "none"; // Let clicks pass through by default
  document.body.appendChild(panelContainer);

  // Attach Shadow DOM for style isolation (Closed mode for higher security)
  shadowRoot = panelContainer.attachShadow({ mode: "closed" });

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
    :host(.theme-purple) {
      --primary: #c084fc;
      --primary-hover: #a855f7;
      --primary-glow: rgba(192, 132, 252, 0.3);
      --bg: rgba(20, 10, 30, 0.9);
      --border: rgba(255, 255, 255, 0.1);
    }
    :host(.theme-blue) {
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --primary-glow: rgba(59, 130, 246, 0.3);
      --bg: rgba(10, 15, 30, 0.9);
    }
    :host(.theme-tokyonight) {
      --primary: #7aa2f7;
      --primary-hover: #8caaee;
      --primary-glow: rgba(122, 162, 247, 0.3);
      --bg: rgba(26, 27, 38, 0.95);
      --text: #c0caf5;
      --card-bg: rgba(36, 40, 59, 0.8);
      --border: rgba(122, 162, 247, 0.2);
    }
    :host(.theme-catppuccin) {
      --primary: #cba6f7;
      --primary-hover: #b4befe;
      --primary-glow: rgba(203, 166, 247, 0.3);
      --bg: rgba(30, 30, 46, 0.95);
      --text: #cdd6f4;
      --card-bg: rgba(49, 50, 68, 0.8);
      --border: rgba(203, 166, 247, 0.2);
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
      pointer-events: auto; /* Re-enable clicks for panel */
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
      font-size: 16px;
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
      font-size: 14.5px;
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
      font-size: 12.5px;
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
      font-size: 13.5px;
    }

    /* Markdown output styles */
    .summary-text {
      color: #f3f4f6;
      font-size: 14.5px;
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

    .summary-text h1 { font-size: 21px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    .summary-text h2 { font-size: 19px; }
    .summary-text h3 { font-size: 16px; border-left: 3px solid var(--primary); padding-left: 8px; }
    .summary-text h4 { font-size: 15px; color: var(--text-muted); }

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
      font-size: 13.5px;
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
      font-size: 13.5px;
    }

    /* Advanced View Code Blocks */
    .code-block-wrapper {
      background: rgba(10, 10, 15, 0.6);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin: 18px 0;
      overflow: hidden;
    }
    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .code-copy-btn {
      background: none;
      border: 1px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .code-copy-btn:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .code-block-wrapper pre {
      margin: 0;
      padding: 14px;
      overflow-x: auto;
      border: none;
      border-radius: 0;
      background: transparent;
    }

    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      margin: 18px 0;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .summary-text table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }

    .summary-text th {
      background: rgba(255, 255, 255, 0.05);
      font-weight: 600;
      color: #ffffff;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    .summary-text td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      color: #e2e8f0;
      vertical-align: top;
    }

    .summary-text tr:last-child td {
      border-bottom: none;
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
      font-size: 13px;
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
      font-size: 14px;
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

    /* Chat UI Styles */
    #chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    #chat-messages {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
    }
    #chat-messages::-webkit-scrollbar {
      width: 6px;
    }
    #chat-messages::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    .chat-msg {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14.5px;
      line-height: 1.5;
    }
    .chat-msg.user {
      align-self: flex-end;
      background: var(--primary);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .chat-msg.ai {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }
    .chat-msg.ai .summary-text {
      font-size: 14.5px;
    }
    .chat-input-wrapper {
      display: flex;
      gap: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
    }
    #chat-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text);
      font-family: inherit;
      font-size: 14.5px;
      resize: none;
      min-height: 24px;
      max-height: 120px;
      padding: 4px;
      outline: none;
    }
    #chat-send-btn {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    #chat-send-btn:hover {
      background: var(--primary-hover);
    }
    #chat-send-btn:disabled {
      background: var(--border);
      color: var(--text-muted);
      cursor: not-allowed;
    }
    #bubble {
      position: fixed;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--bg);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--border);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--primary);
      z-index: 2147483647;
      user-select: none;
      pointer-events: auto; /* Re-enable clicks for bubble */
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 40px var(--primary-glow);
    }
    #bubble svg {
      width: 28px;
      height: 28px;
    }
    #bubble.dragging {
      transition: none;
      opacity: 0.9;
    }
  `;

  shadowRoot.appendChild(style);

  // Load theme from storage
  chrome.storage.local.get({ theme: "default" }, (items) => {
    if (items.theme && items.theme !== "default") {
      panelContainer.className = `theme-${items.theme}`;
    }
  });

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
        <button id="minimize-btn" class="btn-icon" title="Küçült">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <polyline points="4 14 10 14 10 20"/>
            <polyline points="20 10 14 10 14 4"/>
            <line x1="14" y1="10" x2="21" y2="3"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </button>
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
    <div id="content-body" class="content-body" style="display: flex; flex-direction: column;">
      <div id="loader" class="loader-container" style="display: none;">
        <div class="spinner"></div>
        <div id="loader-status" class="loader-text">İçerik analiz ediliyor...</div>
      </div>
      <div id="result-container" style="flex: 1;">
        <div id="source-banner" class="source-info" style="display: none;">
          <strong id="source-title">Sayfa Başlığı</strong>
          <span id="source-url">URL</span>
        </div>
        <div id="summary-output" class="summary-text"></div>
      </div>
      <div id="chat-container" style="display: none;">
        <div id="chat-messages"></div>
        <div class="chat-input-wrapper">
          <textarea id="chat-input" placeholder="Sayfa hakkında soru sor..." rows="1"></textarea>
          <button id="chat-send-btn">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  shadowRoot.appendChild(panel);

  // Create Bubble element
  const bubble = document.createElement("div");
  bubble.id = "bubble";
  bubble.title = "Zen AI'ı Aç";
  bubble.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke-linecap="round" opacity="0.5"/>
      <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6Z" stroke="url(#logoGrad2)" />
      <defs>
        <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="50%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  `;
  shadowRoot.appendChild(bubble);

  // Set up event listeners
  shadowRoot.getElementById("close-btn").addEventListener("click", hideOverlay);
  shadowRoot.getElementById("settings-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "open_options" });
  });

  // Minimize logic
  const minimizeBtn = shadowRoot.getElementById("minimize-btn");
  let isDragging = false;
  let dragStartX, dragStartY;
  let bubbleX = window.innerWidth - 80;
  let bubbleY = 40;

  minimizeBtn.addEventListener("click", () => {
    panel.classList.remove("open");
    setTimeout(() => {
      panelContainer.style.width = "100vw"; // Allow full screen for bubble dragging without breaking host bounds
      bubble.style.display = "flex";
      bubble.style.left = `${bubbleX}px`;
      bubble.style.top = `${bubbleY}px`;
    }, 400);
  });

  // Bubble dragging logic
  bubble.addEventListener("mousedown", (e) => {
    isDragging = false;
    dragStartX = e.clientX - bubbleX;
    dragStartY = e.clientY - bubbleY;
    
    const onMouseMove = (moveEvent) => {
      isDragging = true;
      bubble.classList.add("dragging");
      bubbleX = moveEvent.clientX - dragStartX;
      bubbleY = moveEvent.clientY - dragStartY;
      
      // Keep inside window bounds
      bubbleX = Math.max(0, Math.min(window.innerWidth - 56, bubbleX));
      bubbleY = Math.max(0, Math.min(window.innerHeight - 56, bubbleY));
      
      bubble.style.left = `${bubbleX}px`;
      bubble.style.top = `${bubbleY}px`;
    };

    const onMouseUp = () => {
      bubble.classList.remove("dragging");
      
      // Köşelere yapışma (Snap to corners) mantığı
      if (isDragging) {
        const padding = 24;
        const bubbleSize = 56;
        
        // Ekranın hangi köşesine daha yakın olduğunu bul
        const snapX = (bubbleX + bubbleSize/2 < window.innerWidth / 2) ? padding : window.innerWidth - bubbleSize - padding;
        const snapY = (bubbleY + bubbleSize/2 < window.innerHeight / 2) ? padding : window.innerHeight - bubbleSize - padding;
        
        bubbleX = snapX;
        bubbleY = snapY;
        
        // Yapışma anında yumuşak geçiş (animasyon) ekle
        bubble.style.transition = "left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s, transform 0.2s";
        bubble.style.left = `${bubbleX}px`;
        bubble.style.top = `${bubbleY}px`;
        
        // Sürüklemeye devam edebilmek için geçişi eski haline geri döndür
        setTimeout(() => {
          bubble.style.transition = "transform 0.2s, box-shadow 0.2s";
        }, 300);
      }

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  // Bubble click (restore panel)
  bubble.addEventListener("click", (e) => {
    if (!isDragging) {
      bubble.style.display = "none";
      panelContainer.style.width = "400px";
      setTimeout(() => {
        panel.classList.add("open");
      }, 10);
    }
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

  // Event delegation for code block copy buttons
  shadowRoot.getElementById("content-body").addEventListener("click", async (e) => {
    const codeBtn = e.target.closest(".code-copy-btn");
    if (codeBtn) {
      const codeBlock = codeBtn.closest(".code-block-wrapper").querySelector("code");
      if (codeBlock) {
        try {
          await navigator.clipboard.writeText(codeBlock.innerText);
          const originalHtml = codeBtn.innerHTML;
          codeBtn.innerHTML = `
            <svg width="14" height="14" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Kopyalandı
          `;
          setTimeout(() => {
            codeBtn.innerHTML = originalHtml;
          }, 2000);
        } catch (err) {
          console.error("Kod kopyalanamadı:", err);
        }
      }
    }
  });

  // Chat event listeners
  const chatInput = shadowRoot.getElementById("chat-input");
  const chatSendBtn = shadowRoot.getElementById("chat-send-btn");
  
  const sendChatMessage = () => {
    let text = chatInput.value.trim();
    if (!text) return;
    
    // Slash commands
    let originalText = text;
    if (text.startsWith("/clear")) {
      chatHistory = [];
      saveChatHistory();
      shadowRoot.getElementById("chat-messages").innerHTML = "";
      if (currentPageText.length < 50) {
        appendChatMessage("ai", "Sohbet temizlendi. Sayfada okunabilecek yeterli metin bulamadım, ancak genel sorular sorabilirsiniz.");
      } else {
        appendChatMessage("ai", "Sohbet temizlendi. Bu sayfanın içeriği hakkında bana yeni sorular sorabilirsiniz.");
      }
      chatInput.value = "";
      chatInput.style.height = "auto";
      return;
    } else if (text.startsWith("/çevir")) {
      text = text.replace("/çevir", "Şu metni Türkçe'ye çevir:").trim();
    } else if (text.startsWith("/kod-açıkla")) {
      text = text.replace("/kod-açıkla", "Aşağıdaki kodu satır satır ve detaylı bir şekilde açıkla:").trim();
    } else if (text.startsWith("/5-yaşındakine-anlat")) {
      text = text.replace("/5-yaşındakine-anlat", "Aşağıdaki konuyu 5 yaşındaki bir çocuğun anlayabileceği kadar basit, analojiler kullanarak açıkla:").trim();
    }
    
    appendChatMessage("user", originalText);
    chatInput.value = "";
    chatInput.style.height = "auto";
    chatSendBtn.disabled = true;
    
    // Show AI typing indicator
    const typingId = "typing-" + Date.now();
    appendChatMessage("ai", "Düşünüyor...", typingId);
    
    chrome.runtime.sendMessage({
      action: "chat_with_page",
      text: currentPageText,
      history: chatHistory,
      message: text
    }, (response) => {
      const typingEl = shadowRoot.getElementById(typingId);
      if (typingEl) typingEl.remove();
      
      chatSendBtn.disabled = false;
      
      if (!response) {
        appendChatMessage("ai", "Hata: Sunucu ile iletişim kurulamadı.");
        return;
      }
      
      if (response.success) {
        const replyHtml = parseMarkdown(response.reply);
        appendChatMessage("ai", replyHtml, null, true);
        chatHistory.push({ role: "user", content: text });
        chatHistory.push({ role: "assistant", content: response.reply });
        saveChatHistory();
      } else {
        appendChatMessage("ai", `Hata: ${response.error}`);
      }
    });
  };

  chatSendBtn.addEventListener("click", sendChatMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  chatInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
  });
}

function appendChatMessage(sender, textOrHtml, id = null, isHtml = false) {
  const messagesDiv = shadowRoot.getElementById("chat-messages");
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${sender}`;
  if (id) msgDiv.id = id;
  
  if (isHtml) {
    msgDiv.innerHTML = `<div class="summary-text">${textOrHtml}</div>`;
  } else {
    msgDiv.textContent = textOrHtml;
  }
  
  messagesDiv.appendChild(msgDiv);
  
  // Akıllı Kaydırma (Smart Scrolling)
  if (sender === "ai" && isHtml) {
    // Yapay zekanın nihai cevabı geldiğinde, cevabın en üst kısmına odaklan
    setTimeout(() => {
      msgDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  } else {
    // Kullanıcı mesajı veya "Düşünüyor..." uyarısında en alta kaydır
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

// Global chat state for this page
let chatHistory = [];
let currentPageText = "";
let isChatLoaded = false;
let lastSelectedText = "";

function getChatKey() {
  return "zen_chat_" + window.location.hostname + window.location.pathname;
}

function saveChatHistory() {
  chrome.storage.local.set({ [getChatKey()]: chatHistory });
}

function loadChatHistory() {
  if (isChatLoaded) return;
  chrome.storage.local.get([getChatKey()], (result) => {
    const history = result[getChatKey()];
    if (history && Array.isArray(history) && history.length > 0) {
      chatHistory = history;
      history.forEach(msg => {
        if (msg.role === "user") appendChatMessage("user", msg.content);
        if (msg.role === "assistant") appendChatMessage("ai", parseMarkdown(msg.content), null, true);
      });
    } else {
      // First time chatting on this page
      if (currentPageText.length < 50) {
        appendChatMessage("ai", "Sayfada okunabilecek yeterli metin bulamadım, ancak genel sorular sorabilirsiniz.");
      } else {
        appendChatMessage("ai", "Merhaba! Bu sayfanın içeriğini inceledim. Bana sayfayla ilgili istediğiniz soruyu sorabilirsiniz.");
      }
    }
    isChatLoaded = true;
  });
}

// Show the overlay panel
function showOverlay(mode = "summary") {
  createOverlay();
  loadChatHistory();
  
  const resultContainer = shadowRoot.getElementById("result-container");
  const chatContainer = shadowRoot.getElementById("chat-container");
  const bubble = shadowRoot.getElementById("bubble");
  
  if (bubble) bubble.style.display = "none";

  if (mode === "chat") {
    resultContainer.style.display = "none";
    chatContainer.style.display = "flex";
  } else {
    resultContainer.style.display = "block";
    chatContainer.style.display = "none";
  }

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
async function extractPageTextAsync() {
  const title = document.title || "Mevcut Sayfa";
  const url = window.location.href;
  let extraContext = "";

  if (window.location.hostname.includes("youtube.com")) {
    try {
      const html = await fetch(window.location.href).then(r => r.text());
      const match = html.match(/"captionTracks":\[(.*?)\]/);
      if (match) {
        const tracks = JSON.parse(`[${match[1]}]`);
        const track = tracks.find(t => t.languageCode === 'tr') || tracks.find(t => t.languageCode === 'en') || tracks[0];
        if (track) {
          const xml = await fetch(track.baseUrl).then(r => r.text());
          const parser = new DOMParser();
          const doc = parser.parseFromString(xml, "text/xml");
          const texts = Array.from(doc.getElementsByTagName("text")).map(t => t.textContent).join(" ");
          extraContext += "\n\n[YOUTUBE VİDEO ALT YAZISI (TRANSCRIPT)]:\n" + texts;
        }
      }
    } catch (e) {
      console.log("YouTube altyazısı alınamadı:", e);
    }
  }
  
  // Extract JSON-LD SEO schema (often contains hidden product prices on e-commerce sites)
  try {
    const schemas = document.querySelectorAll('script[type="application/ld+json"]');
    schemas.forEach(schema => {
      try {
        const parsed = JSON.parse(schema.innerText);
        // Only include if it has Product, Organization, or relevant e-commerce data to avoid bloat
        const schemaString = JSON.stringify(parsed);
        if (schemaString.includes("Product") || schemaString.includes("price") || schemaString.includes("offers")) {
          // Remove huge image arrays from the stringified JSON to save tokens
          extraContext += "\n\n[GİZLİ SEO/ÜRÜN BİLGİSİ (JSON-LD)]:\n" + JSON.stringify(parsed, (key, val) => key === 'image' ? undefined : val, 2);
        }
      } catch(err) {}
    });
  } catch (e) {
    console.log("JSON-LD alınamadı:", e);
  }

  // Extract WooCommerce variations data which holds dynamic prices
  try {
    const variationForms = document.querySelectorAll('.variations_form[data-product_variations]');
    variationForms.forEach(form => {
      const vars = JSON.parse(form.getAttribute('data-product_variations'));
      // Only keep attributes and price info to avoid huge image blocks
      const cleanVars = vars.map(v => ({
        attributes: v.attributes,
        display_price: v.display_price,
        display_regular_price: v.display_regular_price,
        price_html: v.price_html
      }));
      extraContext += "\n\n[ÜRÜN VARYASYON BİLGİLERİ (Fiyatlar)]:\n" + JSON.stringify(cleanVars, null, 2);
    });
  } catch (e) {
    console.log("Varyasyon bilgisi alınamadı:", e);
  }

  // Clone to avoid breaking original page elements
  const bodyClone = document.body.cloneNode(true);
  
  // Remove interactive and structural elements we don't want summarized
  const elementsToRemove = bodyClone.querySelectorAll(
    "script, style, nav, footer, header, iframe, noscript, svg, select, option, button, [role='banner'], [role='navigation']"
  );
  elementsToRemove.forEach(el => el.remove());
  
  // Try to find structural tags, otherwise use whole document
  // On feed sites (like daily.dev), querySelector("article") might just pick the first tiny feed card.
  // Instead, find the article or main tag with the most text!
  const candidates = Array.from(bodyClone.querySelectorAll("article, main, [role='main']"));
  let mainContent = bodyClone;
  if (candidates.length > 0) {
    mainContent = candidates.reduce((a, b) => {
      const aLen = (a.innerText || "").length;
      const bLen = (b.innerText || "").length;
      return aLen > bLen ? a : b;
    });
  }
  
  let text = mainContent.innerText || mainContent.textContent || "";
  
  // Clean whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  text += extraContext;
  
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
  html = html.replace(/```(?:(\w+)\n)?([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang ? lang : 'text';
    return `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span>${language}</span>
          <button class="code-copy-btn">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            Kopyala
          </button>
        </div>
        <pre><code>${code}</code></pre>
      </div>
    `;
  });
  
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

  // Format list items and tables
  const lines = html.split("\n");
  const resultLines = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for table row
    const isTableRow = line.startsWith("|") && line.endsWith("|");
    
    if (isTableRow) {
      if (inUl) { resultLines.push("</ul>"); inUl = false; }
      if (inOl) { resultLines.push("</ol>"); inOl = false; }
      
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      // Check if it's a separator row (---)
      const isSeparator = cells.every(c => c.replace(/-/g, '').replace(/:/g, '').length === 0);
      
      if (!inTable && !isSeparator) {
        resultLines.push('<div class="table-wrapper"><table>');
        resultLines.push('<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead>');
        resultLines.push('<tbody>');
        inTable = true;
      } else if (inTable && !isSeparator) {
        resultLines.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');
      }
      continue;
    } else {
      if (inTable) {
        resultLines.push('</tbody></table></div>');
        inTable = false;
      }
    }
    
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
  if (inTable) resultLines.push("</tbody></table></div>");

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
      p.startsWith("<blockquote") ||
      p.startsWith("<div class=\"table")
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
    extractPageTextAsync().then(pageData => {
      if (pageData.text.length < 50) {
        showOverlay("summary");
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
      summaryHtml: request.success ? parseMarkdown(request.summary) : null
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

  if (request.action === "chat_page") {
    extractPageTextAsync().then(pageData => {
      currentPageText = pageData.text;
      
      showOverlay("chat");
      shadowRoot.getElementById("loader").style.display = "none";
      
      const brandTitle = shadowRoot.querySelector(".brand-title");
      brandTitle.textContent = "Zen AI Chat";
      
      if (!isChatLoaded || chatHistory.length === 0) {
        // If chat history is entirely empty (and we've waited for loadChatHistory), we could add greeting
        // But loadChatHistory is async. It's better to add the greeting inside loadChatHistory if empty.
      }
    });
  }

  if (request.action === "translate_page_reader") {
    translatePageInPlace();
  }
});

// --- Highlight & Explain (Seç ve Açıkla) ---
const selectionIcon = document.createElement("div");
selectionIcon.id = "zen-ai-selection-icon";
selectionIcon.style.cssText = `
  position: absolute;
  display: none;
  background: var(--primary, #8b5cf6);
  color: white;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 2147483647;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
`;
selectionIcon.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke-linecap="round" opacity="0.5"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6Z"/></svg>`;
selectionIcon.title = "Zen AI ile Açıkla / Özetle";
document.body.appendChild(selectionIcon);

document.addEventListener("mouseup", (e) => {
  if (e.target.closest("#zen-ai-summarizer-container") || e.target.closest("#zen-ai-selection-icon") || e.target.closest("#bubble")) {
    return;
  }
  
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 5) {
    lastSelectedText = text;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    selectionIcon.style.display = "flex";
    selectionIcon.style.top = `${window.scrollY + rect.bottom + 8}px`;
    selectionIcon.style.left = `${window.scrollX + rect.right - 18}px`;
  } else {
    selectionIcon.style.display = "none";
  }
});

document.addEventListener("mousedown", (e) => {
  if (!e.target.closest("#zen-ai-selection-icon")) {
    selectionIcon.style.display = "none";
  }
});

selectionIcon.addEventListener("click", async () => {
  selectionIcon.style.display = "none";
  showOverlay("chat");
  
  // Ensure we have background context
  if (!currentPageText) {
    const pageData = await extractPageTextAsync();
    currentPageText = pageData.text;
  }
  
  const chatInput = shadowRoot.getElementById("chat-input");
  chatInput.value = `Lütfen aşağıdaki metni detaylı bir şekilde açıkla:\n"\n${lastSelectedText}\n"`;
  chatInput.style.height = "auto";
  chatInput.style.height = (chatInput.scrollHeight) + "px";
  chatInput.focus();
});
