// Zen AI Summarizer Options Script

document.addEventListener("DOMContentLoaded", () => {
  const providerSelect = document.getElementById("provider");
  const geminiGroup = document.getElementById("gemini-group");
  const groqGroup = document.getElementById("groq-group");
  const groqModelGroup = document.getElementById("groq-model-group");
  const openrouterGroup = document.getElementById("openrouter-group");
  const openrouterModelGroup = document.getElementById("openrouter-model-group");
  const githubGroup = document.getElementById("github-group");
  const githubModelGroup = document.getElementById("github-model-group");

  const geminiKeyInput = document.getElementById("gemini-key");
  const groqKeyInput = document.getElementById("groq-key");
  const groqModelSelect = document.getElementById("groq-model");
  const openrouterKeyInput = document.getElementById("openrouter-key");
  const openrouterModelSelect = document.getElementById("openrouter-model");
  const githubKeyInput = document.getElementById("github-key");
  const githubModelSelect = document.getElementById("github-model");
  const fetchModelsBtn = document.getElementById("fetch-models-btn");
  
  const languageSelect = document.getElementById("language");
  const detailSelect = document.getElementById("detail-level");
  const themeSelect = document.getElementById("theme");
  
  const toggleGeminiBtn = document.getElementById("toggle-gemini-password");
  const toggleGroqBtn = document.getElementById("toggle-groq-password");
  const toggleOpenrouterBtn = document.getElementById("toggle-openrouter-password");
  const toggleGithubBtn = document.getElementById("toggle-github-password");
  
  const settingsForm = document.getElementById("settings-form");
  const statusBanner = document.getElementById("status");

  // Dynamic fields toggle based on selected provider
  function updateUI() {
    const provider = providerSelect.value;
    if (provider === "gemini") {
      geminiGroup.style.display = "block";
      groqGroup.style.display = "none";
      groqModelGroup.style.display = "none";
      openrouterGroup.style.display = "none";
      openrouterModelGroup.style.display = "none";
      githubGroup.style.display = "none";
      githubModelGroup.style.display = "none";
    } else if (provider === "groq") {
      geminiGroup.style.display = "none";
      groqGroup.style.display = "block";
      groqModelGroup.style.display = "block";
      openrouterGroup.style.display = "none";
      openrouterModelGroup.style.display = "none";
      githubGroup.style.display = "none";
      githubModelGroup.style.display = "none";
    } else if (provider === "openrouter") {
      geminiGroup.style.display = "none";
      groqGroup.style.display = "none";
      groqModelGroup.style.display = "none";
      openrouterGroup.style.display = "block";
      openrouterModelGroup.style.display = "block";
      githubGroup.style.display = "none";
      githubModelGroup.style.display = "none";
    } else if (provider === "github") {
      geminiGroup.style.display = "none";
      groqGroup.style.display = "none";
      groqModelGroup.style.display = "none";
      openrouterGroup.style.display = "none";
      openrouterModelGroup.style.display = "none";
      githubGroup.style.display = "block";
      githubModelGroup.style.display = "block";
    }
  }

  providerSelect.addEventListener("change", updateUI);

  // Load saved settings
  chrome.storage.local.get({
    provider: "gemini",
    geminiApiKey: "",
    groqApiKey: "",
    groqModel: "llama-3.3-70b-versatile",
    openrouterApiKey: "",
    openrouterModel: "",
    openrouterModelsList: [],
    githubApiKey: "",
    githubModel: "gpt-4o",
    language: "Turkish",
    detailLevel: "detailed",
    theme: "default"
  }, (items) => {
    providerSelect.value = items.provider;
    geminiKeyInput.value = items.geminiApiKey;
    groqKeyInput.value = items.groqApiKey;
    groqModelSelect.value = items.groqModel;
    openrouterKeyInput.value = items.openrouterApiKey;
    githubKeyInput.value = items.githubApiKey;
    githubModelSelect.value = items.githubModel;
    languageSelect.value = items.language;
    detailSelect.value = items.detailLevel;
    themeSelect.value = items.theme;
    
    // Populate OpenRouter models if exist
    if (items.openrouterModelsList && items.openrouterModelsList.length > 0) {
      populateModels(items.openrouterModelsList, items.openrouterModel);
    }
    
    updateUI();
  });

  function populateModels(models, selectedModel) {
    openrouterModelSelect.innerHTML = "";
    models.forEach(model => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      openrouterModelSelect.appendChild(option);
    });
    if (selectedModel) {
      openrouterModelSelect.value = selectedModel;
    }
  }

  // Fetch OpenRouter Models
  fetchModelsBtn.addEventListener("click", async () => {
    const key = openrouterKeyInput.value.trim();
    if (!key) {
      alert("Lütfen önce OpenRouter API anahtarını girin.");
      return;
    }
    fetchModelsBtn.textContent = "Yükleniyor...";
    fetchModelsBtn.disabled = true;
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "Authorization": `Bearer ${key}` }
      });
      if (!response.ok) throw new Error("Modeller alınamadı. API anahtarını kontrol edin.");
      const data = await response.json();
      const models = data.data.map(m => ({ id: m.id, name: m.name })).sort((a, b) => a.name.localeCompare(b.name));
      populateModels(models, models[0].id);
      
      chrome.storage.local.set({ openrouterModelsList: models });
      alert("Modeller başarıyla yüklendi!");
    } catch (err) {
      alert("Hata: " + err.message);
    } finally {
      fetchModelsBtn.textContent = "Modelleri Getir";
      fetchModelsBtn.disabled = false;
    }
  });

  // Toggle API Key visibility
  toggleGeminiBtn.addEventListener("click", () => {
    if (geminiKeyInput.type === "password") {
      geminiKeyInput.type = "text";
      toggleGeminiBtn.textContent = "Gizle";
    } else {
      geminiKeyInput.type = "password";
      toggleGeminiBtn.textContent = "Göster";
    }
  });

  toggleGroqBtn.addEventListener("click", () => {
    if (groqKeyInput.type === "password") {
      groqKeyInput.type = "text";
      toggleGroqBtn.textContent = "Gizle";
    } else {
      groqKeyInput.type = "password";
      toggleGroqBtn.textContent = "Göster";
    }
  });

  toggleOpenrouterBtn.addEventListener("click", () => {
    if (openrouterKeyInput.type === "password") {
      openrouterKeyInput.type = "text";
      toggleOpenrouterBtn.textContent = "Gizle";
    } else {
      openrouterKeyInput.type = "password";
      toggleOpenrouterBtn.textContent = "Göster";
    }
  });

  toggleGithubBtn.addEventListener("click", () => {
    if (githubKeyInput.type === "password") {
      githubKeyInput.type = "text";
      toggleGithubBtn.textContent = "Gizle";
    } else {
      githubKeyInput.type = "password";
      toggleGithubBtn.textContent = "Göster";
    }
  });

  // Save settings
  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const provider = providerSelect.value;
    const geminiApiKey = geminiKeyInput.value.trim();
    const groqApiKey = groqKeyInput.value.trim();
    const groqModel = groqModelSelect.value;
    const openrouterApiKey = openrouterKeyInput.value.trim();
    const openrouterModel = openrouterModelSelect.value;
    const githubApiKey = githubKeyInput.value.trim();
    const githubModel = githubModelSelect.value;
    const language = languageSelect.value;
    const detailLevel = detailSelect.value;
    const theme = themeSelect.value;

    chrome.storage.local.set({
      provider,
      geminiApiKey,
      groqApiKey,
      groqModel,
      openrouterApiKey,
      openrouterModel,
      githubApiKey,
      githubModel,
      language,
      detailLevel,
      theme
    }, () => {
      // Show success status banner
      statusBanner.style.display = "flex";
      
      // Auto-hide status banner after 3 seconds
      setTimeout(() => {
        statusBanner.style.display = "none";
      }, 3000);
    });
  });
});
