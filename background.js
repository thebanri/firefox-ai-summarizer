// Set up context menus when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "summarize-page",
      title: "Bu Sayfayı AI ile Özetle",
      contexts: ["page", "selection"]
    });

    chrome.contextMenus.create({
      id: "summarize-link",
      title: "Bu Bağlantıyı AI ile Özetle",
      contexts: ["link"]
    });

    chrome.contextMenus.create({
      id: "translate-page",
      title: "Bu Sayfayı AI ile Çevir",
      contexts: ["page"]
    });
  });
});

// Detect SPA URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    chrome.tabs.sendMessage(tabId, { action: "url_changed", url: changeInfo.url }).catch(() => {});
  }
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === "summarize-page") {
    // Tell content script to summarize the active page
    chrome.tabs.sendMessage(tab.id, { action: "summarize_page" });
  } else if (info.menuItemId === "summarize-link") {
    // Tell content script to open overlay in loading state for the link
    chrome.tabs.sendMessage(tab.id, { 
      action: "summarize_link_start", 
      url: info.linkUrl 
    });

    // Start fetching and summarizing the link content
    summarizeLink(info.linkUrl, tab.id);
  } else if (info.menuItemId === "translate-page") {
    chrome.tabs.sendMessage(tab.id, { action: "translate_page_reader" });
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize_current_page_text") {
    // Content script has extracted page text and requested summary
    requestSummary(request.text, request.title)
      .then(summary => {
        sendResponse({ success: true, summary });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }

  if (request.action === "chat_with_page") {
    requestChat(request.text, request.history, request.message)
      .then(reply => {
        sendResponse({ success: true, reply });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (request.action === "translate_page") {
    requestTranslation(request.text, request.title, sender.tab?.id)
      .then(translation => {
        sendResponse({ success: true, translation });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === "open_options") {
    chrome.runtime.openOptionsPage();
  }
});

// Fetch and summarize a target link
async function summarizeLink(url, tabId) {
  try {
    // 1. Fetch HTML from URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bağlantı yüklenemedi: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();

    // 2. Extract title & clean text content
    const pageData = cleanHtml(html);

    if (!pageData.text || pageData.text.length < 100) {
      throw new Error("Bağlantıdan yeterli metin içeriği ayıklanamadı. Sayfa boş veya Javascript gerektiriyor olabilir.");
    }

    // 3. Summarize using general requestSummary
    const summary = await requestSummary(pageData.text, pageData.title);

    // 4. Send summary to content script
    chrome.tabs.sendMessage(tabId, { 
      action: "summarize_link_success", 
      summary: summary,
      title: pageData.title,
      url: url
    });

  } catch (error) {
    chrome.tabs.sendMessage(tabId, { 
      action: "summarize_link_error", 
      error: error.message 
    });
  }
}

// Helper to clean HTML and extract Title & clean text
function cleanHtml(html) {
  let title = "Bağlantı";
  let text = "";

  try {
    // Use DOMParser if available (Firefox background page supports it)
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract title
      if (doc.title) {
        title = doc.title.trim();
      } else {
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        }
      }

      // Remove scripts, styles, navs, footers, headers, and svgs
      const elementsToRemove = doc.querySelectorAll('script, style, svg, nav, footer, header, iframe, noscript, button, link, meta');
      elementsToRemove.forEach(el => el.remove());

      // Get body text
      text = doc.body.innerText || doc.body.textContent || "";
    } else {
      throw new Error("DOMParser is not defined");
    }
  } catch (e) {
    console.warn("DOMParser failed or not available, using regex fallback:", e);
    
    // Fallback: Extract title via regex
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // Basic HTML text cleaning (stripping scripts, styles, tags)
    text = html;
    
    // Strip head, scripts, styles, SVG, nav, footer, header
    text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    text = text.replace(/<(script|style|svg|header|footer|nav|noscript)[^>]*>([\s\S]*?)<\/\1>/gi, '');
    
    // Strip remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
  }

  // Clean whitespace and HTML entities
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#039;/g, "'")
             .replace(/&nbsp;/g, ' ');

  // Limit characters to avoid hitting API prompt limit
  text = text.slice(0, 50000);

  return { title, text };
}

const SETTINGS_DEFAULTS = {
  provider: "gemini",
  geminiApiKey: "",
  apiKey: "", // legacy fallback
  groqApiKey: "",
  groqModel: "llama-3.3-70b-versatile",
  openrouterApiKey: "",
  openrouterModel: "",
  nvidiaApiKey: "",
  nvidiaModel: "nvidia/nemotron-3-super-120b-a12b",
  language: "Turkish",
  detailLevel: "detailed"
};

// "latest" alias so the extension keeps working when Google retires a Flash version
const GEMINI_MODEL = "gemini-flash-latest";

// OpenAI-compatible chat completion providers
const OPENAI_PROVIDERS = {
  groq: { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions" },
  openrouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: {
      "HTTP-Referer": "https://github.com/thebanri/firefox-ai-summarizer",
      "X-OpenRouter-Title": "Zen AI Summarizer"
    }
  },
  nvidia: { name: "NVIDIA", url: "https://integrate.api.nvidia.com/v1/chat/completions" }
};

const TRUNCATED_NOTE = "\n\n*(Not: Yanıt yarıda kesildi. Neden: Maksimum uzunluğa ulaşıldı)*";

// fetch with timeout and retry on rate limits / transient server errors
async function fetchWithRetry(url, options, retries = 2) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= retries) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 2000 * (attempt + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function readApiError(response, providerName) {
  const errorData = await response.json().catch(() => ({}));
  const apiError = errorData.error?.message || errorData.detail || response.statusText || response.status;
  return new Error(`${providerName} API Hatası (${response.status}): ${apiError}`);
}

// Single entry point for every AI request: messages are [{ role: "user"|"assistant", content }]
async function callAI(system, messages, { maxTokens = 4096, webSearch = false } = {}) {
  const settings = await chrome.storage.local.get(SETTINGS_DEFAULTS);
  const provider = settings.provider || "gemini";
  console.log(`[Zen AI Summarizer] Yapay zeka sağlayıcısı kullanılıyor: ${provider.toUpperCase()}`);

  if (provider === "gemini") {
    const key = settings.geminiApiKey || settings.apiKey;
    if (!key) throw new Error("API_KEY_MISSING");
    return callGemini(key, system, messages, webSearch);
  }

  const config = OPENAI_PROVIDERS[provider];
  if (!config) {
    throw new Error(`"${provider}" sağlayıcısı artık desteklenmiyor. Lütfen ayarlardan başka bir sağlayıcı seçin.`);
  }
  const key = settings[`${provider}ApiKey`];
  const model = settings[`${provider}Model`];
  if (!key) throw new Error("API_KEY_MISSING");
  if (!model) throw new Error(`Lütfen ayarlardan ${config.name} modelini seçin.`);
  return callOpenAICompatible(config, key, model, system, messages, maxTokens);
}

async function callGemini(apiKey, system, messages, webSearch) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      })),
      // Generous cap: thinking tokens count against it on Gemini
      generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
      ...(webSearch && { tools: [{ googleSearch: {} }] }),
      safetySettings: ["HARASSMENT", "HATE_SPEECH", "SEXUALLY_EXPLICIT", "DANGEROUS_CONTENT"]
        .map(c => ({ category: `HARM_CATEGORY_${c}`, threshold: "BLOCK_NONE" }))
    })
  });

  if (!response.ok) throw await readApiError(response, "Gemini");

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  // Grounded/thinking responses can be split across several parts
  let text = (candidate?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join("");

  if (!text) {
    const reason = finishReason || data.promptFeedback?.blockReason;
    throw new Error(reason ? `Yapay zeka yanıt üretemedi. Durma Nedeni: ${reason}` : "Yapay zekadan boş yanıt döndü.");
  }
  if (finishReason === "MAX_TOKENS") text += TRUNCATED_NOTE;
  return text;
}

async function callOpenAICompatible(config, apiKey, model, system, messages, maxTokens) {
  console.log(`[Zen AI Summarizer] ${config.name} API isteği başlatılıyor (Model: ${model})...`);
  const response = await fetchWithRetry(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...config.headers
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.3,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) throw await readApiError(response, config.name);

  const data = await response.json();
  const choice = data.choices?.[0];
  // Reasoning models may wrap their chain of thought in <think> tags inside content
  let text = (choice?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!text) throw new Error(`${config.name} API'den boş yanıt döndü.`);
  if (choice.finish_reason === "length") text += TRUNCATED_NOTE;
  return text;
}

async function requestSummary(text, pageTitle) {
  const { language, detailLevel } = await chrome.storage.local.get(SETTINGS_DEFAULTS);
  const system = buildPrompt(language, detailLevel, pageTitle);
  return callAI(system, [{ role: "user", content: `Lütfen aşağıdaki web sayfası içeriğini özetle:\n\n${text}` }], { webSearch: true });
}

// Split on paragraph boundaries so each request stays well under provider output limits
function splitIntoChunks(text, maxLength = 6000) {
  const chunks = [];
  let current = "";
  for (const paragraph of text.split(/\n{2,}/)) {
    for (let i = 0; i < paragraph.length; i += maxLength) {
      const piece = paragraph.slice(i, i + maxLength);
      if (current && current.length + piece.length + 2 > maxLength) {
        chunks.push(current);
        current = "";
      }
      current += (current ? "\n\n" : "") + piece;
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

// Translate page text chunk by chunk, streaming partial results to the tab
async function requestTranslation(text, pageTitle, tabId) {
  const { language } = await chrome.storage.local.get(SETTINGS_DEFAULTS);
  const system = `Sen profesyonel bir çevirmensin. Sana verilen web sayfası metnini "${language}" diline çevir.
KURALLAR:
1. Sadece çeviriyi Markdown olarak döndür. "İşte çeviri:" gibi giriş, açıklama veya yorum ekleme.
2. Başlıkları (#), listeleri, tabloları ve paragraf yapısını aynen koru.
3. Kod bloklarını, URL'leri, komutları, değişken, marka ve ürün adlarını çevirme.
4. Metnin bir kısmı zaten "${language}" dilindeyse o kısmı olduğu gibi bırak.
5. Kelime kelime değil, anlamı koruyarak akıcı ve doğal bir dille çevir.
6. Metin uzun bir sayfanın bir parçası olabilir; eksik görünse bile tamamlamaya veya özetlemeye çalışma, sadece verilen kısmı çevir.`;

  const chunks = splitIntoChunks(text);
  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    const content = i === 0 ? `Sayfa Başlığı: ${pageTitle}\n\n${chunks[i]}` : chunks[i];
    parts.push(await callAI(system, [{ role: "user", content }]));
    if (tabId && i < chunks.length - 1) {
      chrome.tabs.sendMessage(tabId, {
        action: "translate_progress",
        translation: parts.join("\n\n"),
        done: i + 1,
        total: chunks.length
      }).catch(() => {});
    }
  }
  return parts.join("\n\n");
}

// Build prompt based on settings
function buildPrompt(language, detailLevel, pageTitle) {
  let detailInstruction = "";
  if (detailLevel === "quick") {
    detailInstruction = "Çok kısa ve öz olmalıdır. En temel fikri açıklayan en fazla 2-3 kısa cümlelik tek bir paragraf yaz. Kesinlikle uzatma.";
  } else if (detailLevel === "bullets") {
    detailInstruction = "Sadece en kritik 4-5 maddeyi içeren kısa bir liste yap. Her bir madde en fazla 10-15 kelimeden oluşmalı ve kısa açıklamalı olmalıdır.";
  } else {
    // Detailed level: Comprehensive, bulleted, emphasizing, and easy to learn.
    detailInstruction = "İçerikteki tüm önemli teknik detayları, karşılaştırmaları ve temel kavramları kapsayan, kolay öğrenilebilir ve akılda kalıcı bir özet çıkar. Düz paragraflar yazmak yerine bilgileri konu başlıkları altında maddeler halinde grupla. Şu yapıya uy:\n\n" +
      "1. Kısa bir giriş cümlesi.\n" +
      "2. Gruplanmış ana maddeler (Örn: **[Konu Başlığı]** altında `- **[Kritik Kavram]:** [Kolay anlaşılır, vurgulayıcı ve akılda kalıcı açıklama cümlesi]`).\n" +
      "3. Varsa kavramların karşılaştırmaları (Örn: HTTP vs HTTPS farkları, portlar, SSL/TLS vb.) net maddeler halinde listelenmelidir.\n" +
      "4. Sonuç olarak konunun önemini vurgulayan 1-2 cümlelik kısa bir kapanış.";
  }

  return `Sen profesyonel bir web sayfası özetleme asistanısın. Görevin, sana verilen web sayfası içeriğini analiz etmek ve aşağıdaki kurallara göre özetlemektir:
1. Özeti tamamen "${language}" dilinde yaz.
2. Sayfa başlığı: "${pageTitle}".
3. ${detailInstruction}
4. Markdown biçimlendirmesini (kalın kelimeler, listeler, alt başlıklar) kullanarak temiz, şık ve okunabilirliği çok yüksek bir çıktı üret.
5. Gereksiz girişler (örn. "İşte özetiniz:", "Makale şunları anlatıyor:") yazmadan doğrudan özetle başla.
6. Reklamları ve ilgisiz metinleri göz ardı et, tamamen teknik doğruluğa ve önemli detaylara odaklan.`;
}

async function requestChat(pageText, history, userMessage) {
  const settings = await chrome.storage.local.get(SETTINGS_DEFAULTS);
  const systemPrompt = `Sen profesyonel, akıcı ve doğal konuşan bir yapay zeka asistanısın. Görevin, kullanıcının bulunduğu web sayfası hakkında sorularını cevaplamak. Cevaplarını kesinlikle hatasız, doğal ve akıcı bir "${settings.language}" dilinde ver. 

ÖNEMLİ KURALLAR:
1. YABANCI DİL YASAĞI: Kullanıcının dilinden ("${settings.language}") ASLA şaşma. Özellikle sayıların veya para birimlerinin (USD vb.) sonuna Japonca ("です", "ます" vb.) veya Çince gibi alakasız dillerden harfler, ekler veya karakterler KESİNLİKLE ekleme.
2. GİZLİ GRAFİK VERİLERİ (ÇOK ÖNEMLİ): Sana verilen metnin en sonunda "[GİZLİ İPUÇLARI / GRAFİK VERİLERİ]" gibi bir bölüm varsa, buradaki sayılar ve veriler kullanıcının o an fareyle üzerine geldiği grafiklerin içindeki çok kritik verilerdir. Kullanıcı sana bir modelin, grafiğin veya bir şeyin "kaç olduğunu / değerini" sorarsa ve ana metinde bulamazsan, kesinlikle bu gizli ipuçları kısmındaki verileri o konuyla doğrudan ilişkilendir ve varsayım yaparak cevapla (Örn: "Sayfadaki verilere göre 95K Input, 7.8K Output görünmektedir" gibi). "Bulamadım" demek yerine bu gizli verileri kullan.
3. HALÜSİNASYON YASAK: Asla rastgele harfler veya anlamsız alfabeler kullanma.
4. SADECE SORUYA ODAKLAN: BÜTÜN SAYFAYI VEYA TÜM ÖZELLİKLERİ ASLA özetleme. Sadece ve sadece kullanıcının sorduğu spesifik konuyu cevapla.
5. SOHBET AKIŞI: Bir insan gibi konuş. "İşte özellikler:", "Kısa Cevap:" gibi robotik kalıplardan kaçın.
6. KISA VE NET OL: Sana verilen bağlamı sadece bilgiyi teyit etmek için kullan, kullanıcıya geri kusma.

Aşağıdaki metin şu anda kullanıcının bulunduğu sayfanın içeriğidir (Bu içeriği sadece soruları cevaplamak için arka plan bilgisi olarak kullan, doğrudan okuma):
---
${pageText}
---`;

  const messages = (history || []).map(msg => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.content
  }));
  messages.push({ role: "user", content: userMessage });
  return callAI(systemPrompt, messages, { webSearch: true });
}
