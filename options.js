// Zen AI Summarizer Options Script

const PROVIDERS = ["gemini", "groq", "openrouter", "nvidia"];

// Providers whose model list is fetched from their API
const MODEL_SOURCES = {
  openrouter: {
    url: "https://openrouter.ai/api/v1/models",
    toModels: data => data.data
      .filter(m => !m.expiration_date || new Date(m.expiration_date) > new Date())
      .filter(m => !m.architecture?.output_modalities || m.architecture.output_modalities.includes("text"))
      .map(m => {
        const free = m.pricing?.prompt === "0" && m.pricing?.completion === "0";
        return { id: m.id, name: free ? `${m.name} (Ücretsiz)` : m.name };
      })
  },
  nvidia: {
    url: "https://integrate.api.nvidia.com/v1/models",
    // The catalog also lists embedding/safety/reward models that cannot chat
    toModels: data => data.data
      .filter(m => !/embed|safety|guard|reward|parse|rerank/i.test(m.id))
      .map(m => ({ id: m.id, name: m.id }))
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const providerSelect = $("provider");
  const languageSelect = $("language");
  const detailSelect = $("detail-level");
  const themeSelect = $("theme");
  const statusBanner = $("status");

  // Show only the selected provider's fields
  function updateUI() {
    PROVIDERS.forEach(p => {
      const display = providerSelect.value === p ? "block" : "none";
      $(`${p}-group`).style.display = display;
      const modelGroup = $(`${p}-model-group`);
      if (modelGroup) modelGroup.style.display = display;
    });
  }

  providerSelect.addEventListener("change", updateUI);

  function populateModels(provider, models, selectedModel) {
    const select = $(`${provider}-model`);
    select.innerHTML = "";
    models.forEach(model => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      select.appendChild(option);
    });
    if (selectedModel && models.some(m => m.id === selectedModel)) {
      select.value = selectedModel;
    }
  }

  // Load saved settings
  chrome.storage.local.get({
    provider: "gemini",
    geminiApiKey: "",
    groqApiKey: "",
    groqModel: "llama-3.3-70b-versatile",
    openrouterApiKey: "",
    openrouterModel: "",
    openrouterModelsList: [],
    nvidiaApiKey: "",
    nvidiaModel: "nvidia/nemotron-3-super-120b-a12b",
    nvidiaModelsList: [],
    language: "Turkish",
    detailLevel: "detailed",
    theme: "default"
  }, (items) => {
    // Retired providers (e.g. GitHub Models) fall back to the default
    providerSelect.value = PROVIDERS.includes(items.provider) ? items.provider : "gemini";
    PROVIDERS.forEach(p => { $(`${p}-key`).value = items[`${p}ApiKey`]; });
    $("groq-model").value = items.groqModel;
    $("nvidia-model").value = items.nvidiaModel;
    Object.keys(MODEL_SOURCES).forEach(p => {
      if (items[`${p}ModelsList`].length > 0) {
        populateModels(p, items[`${p}ModelsList`], items[`${p}Model`]);
      }
    });
    languageSelect.value = items.language;
    detailSelect.value = items.detailLevel;
    themeSelect.value = items.theme;
    updateUI();
  });

  // Fetch model lists
  Object.entries(MODEL_SOURCES).forEach(([provider, source]) => {
    const btn = $(`fetch-${provider}-models-btn`);
    btn.addEventListener("click", async () => {
      const key = $(`${provider}-key`).value.trim();
      if (!key) {
        alert("Lütfen önce API anahtarını girin.");
        return;
      }
      btn.textContent = "Yükleniyor...";
      btn.disabled = true;
      try {
        const response = await fetch(source.url, { headers: { "Authorization": `Bearer ${key}` } });
        if (!response.ok) throw new Error("Modeller alınamadı. API anahtarını kontrol edin.");
        const models = source.toModels(await response.json()).sort((a, b) => a.name.localeCompare(b.name));
        if (models.length === 0) throw new Error("Kullanılabilir model bulunamadı.");
        populateModels(provider, models, $(`${provider}-model`).value);
        chrome.storage.local.set({ [`${provider}ModelsList`]: models });
        alert("Modeller başarıyla yüklendi!");
      } catch (err) {
        alert("Hata: " + err.message);
      } finally {
        btn.textContent = "Modelleri Getir";
        btn.disabled = false;
      }
    });
  });

  // Toggle API Key visibility
  PROVIDERS.forEach(p => {
    const input = $(`${p}-key`);
    const toggle = $(`toggle-${p}-password`);
    toggle.addEventListener("click", () => {
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      toggle.textContent = hidden ? "Gizle" : "Göster";
    });
  });

  // Save settings
  $("settings-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const settings = {
      provider: providerSelect.value,
      groqModel: $("groq-model").value,
      openrouterModel: $("openrouter-model").value,
      nvidiaModel: $("nvidia-model").value,
      language: languageSelect.value,
      detailLevel: detailSelect.value,
      theme: themeSelect.value
    };
    PROVIDERS.forEach(p => { settings[`${p}ApiKey`] = $(`${p}-key`).value.trim(); });

    chrome.storage.local.set(settings, () => {
      statusBanner.style.display = "flex";
      setTimeout(() => {
        statusBanner.style.display = "none";
      }, 3000);
    });
  });
});
