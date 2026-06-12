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
  });
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

// Request summary from Gemini or Groq depending on provider settings
async function requestSummary(text, pageTitle) {
  // Get API key and options from local storage
  const settings = await chrome.storage.local.get({
    provider: "gemini",
    geminiApiKey: "",
    apiKey: "", // legacy fallback
    groqApiKey: "",
    groqModel: "llama-3.3-70b-versatile",
    openrouterApiKey: "",
    openrouterModel: "",
    githubApiKey: "",
    githubModel: "",
    language: "Turkish",
    detailLevel: "detailed"
  });

  const provider = settings.provider || "gemini";
  const prompt = buildPrompt(settings.language, settings.detailLevel, pageTitle);

  console.log(`[Zen AI Summarizer] Yapay zeka sağlayıcısı kullanılıyor: ${provider.toUpperCase()}`);

  if (provider === "gemini") {
    const key = settings.geminiApiKey || settings.apiKey;
    if (!key) {
      throw new Error("API_KEY_MISSING");
    }
    return requestSummaryFromGemini(text, prompt, key);
  } else if (provider === "groq") {
    if (!settings.groqApiKey) {
      throw new Error("API_KEY_MISSING");
    }
    return requestSummaryFromGroq(text, prompt, settings.groqApiKey, settings.groqModel);
  } else if (provider === "openrouter") {
    if (!settings.openrouterApiKey) {
      throw new Error("API_KEY_MISSING");
    }
    if (!settings.openrouterModel) {
      throw new Error("Lütfen seçeneklerden OpenRouter modelini seçin.");
    }
    return requestSummaryFromOpenRouter(text, prompt, settings.openrouterApiKey, settings.openrouterModel);
  } else if (provider === "github") {
    if (!settings.githubApiKey) {
      throw new Error("API_KEY_MISSING");
    }
    if (!settings.githubModel) {
      throw new Error("Lütfen GitHub modelini seçin.");
    }
    return requestSummaryFromGithub(text, prompt, settings.githubApiKey, settings.githubModel);
  } else {
    throw new Error(`Bilinmeyen sağlayıcı: ${provider}`);
  }
}

// Translate page text to markdown
async function requestTranslation(text, pageTitle) {
  const settings = await chrome.storage.local.get({
    provider: "gemini",
    geminiApiKey: "",
    apiKey: "", // legacy fallback
    groqApiKey: "",
    groqModel: "llama-3.3-70b-versatile",
    openrouterApiKey: "",
    openrouterModel: "",
    githubApiKey: "",
    githubModel: ""
  });

  const provider = settings.provider || "gemini";
  const prompt = `Lütfen aşağıdaki web sayfası metnini Türkçe'ye çevir. Çıktıyı doğrudan, sayfada okunabilecek güzel bir makale (Markdown) formatında ver. Başlıklar, paragraflar ve listeleri koru. İngilizce kelime veya kod parçalarını bozma.\n\nSayfa Başlığı: ${pageTitle}\n\nİçerik:\n${text}`;

  console.log(`[Zen AI Summarizer] Reader Mode Çeviri yapılıyor: ${provider.toUpperCase()}`);

  if (provider === "gemini") {
    const key = settings.geminiApiKey || settings.apiKey;
    if (!key) throw new Error("API_KEY_MISSING");
    return requestSummaryFromGemini(text, prompt, key);
  } else if (provider === "groq") {
    if (!settings.groqApiKey) throw new Error("API_KEY_MISSING");
    return requestSummaryFromGroq(text, prompt, settings.groqApiKey, settings.groqModel);
  } else if (provider === "openrouter") {
    if (!settings.openrouterApiKey) throw new Error("API_KEY_MISSING");
    if (!settings.openrouterModel) throw new Error("Lütfen seçeneklerden OpenRouter modelini seçin.");
    return requestSummaryFromOpenRouter(text, prompt, settings.openrouterApiKey, settings.openrouterModel);
  } else if (provider === "github") {
    if (!settings.githubApiKey) throw new Error("API_KEY_MISSING");
    if (!settings.githubModel) throw new Error("Lütfen GitHub modelini seçin.");
    return requestSummaryFromGithub(text, prompt, settings.githubApiKey, settings.githubModel);
  } else {
    throw new Error(`Bilinmeyen sağlayıcı: ${provider}`);
  }
}

// Request summary from Gemini
async function requestSummaryFromGemini(text, prompt, apiKey) {
  console.log("[Zen AI Summarizer] Gemini API isteği başlatılıyor...");
  const apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const response = await fetch(`${apiEndpoint}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${prompt}\n\nİçerik:\n${text}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192
      },
      tools: [
        { googleSearch: {} }
      ],
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiError = errorData.error?.message || response.statusText;
    throw new Error(`Gemini API Hatası: ${apiError}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  let summaryText = candidate?.content?.parts?.[0]?.text;

  if (!summaryText) {
    const finishReason = candidate?.finishReason;
    if (finishReason) {
      throw new Error(`Yapay zeka yanıt üretemedi. Durma Nedeni: ${finishReason}`);
    }
    throw new Error("Yapay zekadan boş yanıt döndü.");
  }

  // Check if response was truncated
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    summaryText += `\n\n*(Not: Özet oluşturma işlemi yarıda kesildi. Neden: ${finishReason})*`;
  }

  return summaryText;
}

// Request summary from Groq API
async function requestSummaryFromGroq(text, prompt, apiKey, model) {
  console.log(`[Zen AI Summarizer] Groq API isteği başlatılıyor (Model: ${model})...`);
  const apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `Lütfen aşağıdaki web sayfası içeriğini özetle:\n\n${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiError = errorData.error?.message || response.statusText;
    throw new Error(`Groq API Hatası: ${apiError}`);
  }

  const data = await response.json();
  let summaryText = data.choices?.[0]?.message?.content;

  if (!summaryText) {
    throw new Error("Groq API'den boş yanıt döndü.");
  }

  // Check if response was truncated
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason && finishReason === "length") {
    summaryText += `\n\n*(Not: Özet oluşturma işlemi yarıda kesildi. Neden: Maksimum uzunluğa ulaşıldı)*`;
  }

  return summaryText;
}

// Request summary from OpenRouter API
async function requestSummaryFromOpenRouter(text, prompt, apiKey, model) {
  console.log(`[Zen AI Summarizer] OpenRouter API isteği başlatılıyor (Model: ${model})...`);
  const apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/thebanri/firefox-ai-summarizer", // Required by OpenRouter
      "X-Title": "Zen AI Summarizer" // Optional
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `Lütfen aşağıdaki web sayfası içeriğini özetle:\n\n${text}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiError = errorData.error?.message || response.statusText;
    throw new Error(`OpenRouter API Hatası: ${apiError}`);
  }

  const data = await response.json();
  let summaryText = data.choices?.[0]?.message?.content;

  if (!summaryText) {
    throw new Error("OpenRouter API'den boş yanıt döndü.");
  }

  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason && finishReason === "length") {
    summaryText += `\n\n*(Not: Özet oluşturma işlemi yarıda kesildi. Neden: Maksimum uzunluğa ulaşıldı)*`;
  }

  return summaryText;
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

// Chat functions
async function requestChat(pageText, history, userMessage) {
  const settings = await chrome.storage.local.get({
    provider: "gemini",
    geminiApiKey: "",
    apiKey: "", // legacy
    groqApiKey: "",
    groqModel: "llama-3.3-70b-versatile",
    openrouterApiKey: "",
    openrouterModel: "",
    githubApiKey: "",
    githubModel: "",
    language: "Turkish"
  });

  const provider = settings.provider || "gemini";
  
  const systemPrompt = `Sen profesyonel, akıcı ve doğal konuşan bir yapay zeka asistanısın. Görevin, kullanıcının bulunduğu web sayfası hakkında sorularını cevaplamak. Cevaplarını kesinlikle hatasız, doğal ve akıcı bir "${settings.language}" dilinde ver. 

ÖNEMLİ KURALLAR:
1. HALÜSİNASYON YASAK: Asla rastgele harfler veya anlamsız alfabeler kullanma.
2. SADECE SORUYA ODAKLAN (ÇOK ÖNEMLİ): Kullanıcı "özetle", "liste yap" dese bile, BÜTÜN SAYFAYI VEYA TÜM ÖZELLİKLERİ ASLA özetleme. Sadece ve sadece kullanıcının sorduğu spesifik konuyu (örneğin "server kurabilir miyim?") cevapla. Cevapla alakasız donanım özelliklerini listeleme.
3. SOHBET AKIŞI: Bir insan gibi konuş. "İşte özellikler:", "Kısa Cevap:" gibi robotik kalıplardan kaçın.
4. KISA VE NET OL: Sana verilen bağlamı (sayfa içeriğini) sadece bilgiyi teyit etmek için kullan, kullanıcıya geri kusma.
5. TEKRARA DÜŞME: Aynı başlıkları ve kapanış cümlelerini tekrar etme.

Aşağıdaki metin şu anda kullanıcının bulunduğu sayfanın içeriğidir (Bu içeriği sadece soruları cevaplamak için arka plan bilgisi olarak kullan, asla doğrudan listeleme/okuma):
---
${pageText}
---`;

  if (provider === "gemini") {
    const key = settings.geminiApiKey || settings.apiKey;
    if (!key) throw new Error("API_KEY_MISSING");
    return requestChatFromGemini(systemPrompt, history, userMessage, key);
  } else if (provider === "groq") {
    if (!settings.groqApiKey) throw new Error("API_KEY_MISSING");
    return requestChatFromGroq(systemPrompt, history, userMessage, settings.groqApiKey, settings.groqModel);
  } else if (provider === "openrouter") {
    if (!settings.openrouterApiKey) throw new Error("API_KEY_MISSING");
    if (!settings.openrouterModel) throw new Error("Lütfen seçeneklerden OpenRouter modelini seçin.");
    return requestChatFromOpenRouter(systemPrompt, history, userMessage, settings.openrouterApiKey, settings.openrouterModel);
  } else if (provider === "github") {
    if (!settings.githubApiKey) throw new Error("API_KEY_MISSING");
    if (!settings.githubModel) throw new Error("Lütfen GitHub modelini seçin.");
    return requestChatFromGithub(systemPrompt, history, userMessage, settings.githubApiKey, settings.githubModel);
  } else {
    throw new Error(`Bilinmeyen sağlayıcı: ${provider}`);
  }
}

async function requestChatFromGemini(systemPrompt, history, userMessage, apiKey) {
  const apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  // Map history to Gemini format
  const contents = [];
  
  // Gemini doesn't use "system" role in contents directly (unless systemInstruction is used, but for simplicity we append to first user message or use systemInstruction)
  const formattedContents = history.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));
  
  formattedContents.push({
    role: "user",
    parts: [{ text: userMessage }]
  });

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: formattedContents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      },
      tools: [
        { googleSearch: {} }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiError = errorData.error?.message || response.statusText;
    throw new Error(`Gemini API Hatası: ${apiError}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  let replyText = candidate?.content?.parts?.[0]?.text;

  if (!replyText) throw new Error("Yapay zekadan boş yanıt döndü.");
  return replyText;
}

async function requestChatFromGroq(systemPrompt, history, userMessage, apiKey, model) {
  const apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage }
  ];

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiError = errorData.error?.message || response.statusText;
    throw new Error(`Groq API Hatası: ${apiError}`);
  }

  const data = await response.json();
  let replyText = data.choices?.[0]?.message?.content;
  if (!replyText) throw new Error("Groq API'den boş yanıt döndü.");
  return replyText;
}

async function requestChatFromOpenRouter(systemPrompt, history, userMessage, apiKey, model) {
  const apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage }
  ];

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/thebanri/firefox-ai-summarizer",
      "X-Title": "Zen AI Summarizer"
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiError = errorData.error?.message || response.statusText;
    throw new Error(`OpenRouter API Hatası: ${apiError}`);
  }

  const data = await response.json();
  let replyText = data.choices?.[0]?.message?.content;
  if (!replyText) throw new Error("OpenRouter API'den boş yanıt döndü.");
  return replyText;
}

// Request summary from GitHub Models
async function requestSummaryFromGithub(text, prompt, apiKey, model) {
  console.log(`[Zen AI Summarizer] GitHub Models isteği başlatılıyor (Model: ${model})...`);
  const apiEndpoint = "https://models.inference.ai.azure.com/chat/completions";

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `Lütfen aşağıdaki web sayfası içeriğini özetle:\n\n${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiError = errorData.error?.message || response.statusText || response.status;
    throw new Error(`GitHub Models Hatası: ${apiError}`);
  }

  const data = await response.json();
  let summaryText = data.choices?.[0]?.message?.content;

  if (!summaryText) {
    throw new Error("GitHub Models'den boş yanıt döndü.");
  }

  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason && finishReason === "length") {
    summaryText += `\n\n*(Not: Özet yarıda kesildi. Neden: Maksimum uzunluğa ulaşıldı)*`;
  }

  return summaryText;
}

// Request chat from GitHub Models
async function requestChatFromGithub(systemPrompt, history, userMessage, apiKey, model) {
  console.log(`[Zen AI Summarizer] GitHub Models Sohbet isteği başlatılıyor (Model: ${model})...`);
  const apiEndpoint = "https://models.inference.ai.azure.com/chat/completions";

  const messages = [
    {
      role: "system",
      content: systemPrompt
    }
  ];

  if (history && history.length > 0) {
    history.forEach(msg => {
      messages.push({
        role: msg.role === "ai" ? "assistant" : msg.role,
        content: msg.content
      });
    });
  }

  messages.push({
    role: "user",
    content: userMessage
  });

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.5,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiError = errorData.error?.message || response.statusText || response.status;
    throw new Error(`GitHub Models Hatası: ${apiError}`);
  }

  const data = await response.json();
  let replyText = data.choices?.[0]?.message?.content;

  if (!replyText) {
    throw new Error("GitHub Models'den boş yanıt döndü.");
  }

  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason && finishReason === "length") {
    replyText += `\n\n*(Not: Yanıt yarıda kesildi. Neden: Maksimum uzunluğa ulaşıldı)*`;
  }

  return replyText;
}
