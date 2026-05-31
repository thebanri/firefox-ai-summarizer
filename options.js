// Zen AI Summarizer Options Script

document.addEventListener("DOMContentLoaded", () => {
  const providerSelect = document.getElementById("provider");
  const geminiGroup = document.getElementById("gemini-group");
  const groqGroup = document.getElementById("groq-group");
  const groqModelGroup = document.getElementById("groq-model-group");

  const geminiKeyInput = document.getElementById("gemini-key");
  const groqKeyInput = document.getElementById("groq-key");
  const groqModelSelect = document.getElementById("groq-model");
  const languageSelect = document.getElementById("language");
  const detailSelect = document.getElementById("detail-level");
  
  const toggleGeminiBtn = document.getElementById("toggle-gemini-password");
  const toggleGroqBtn = document.getElementById("toggle-groq-password");
  
  const settingsForm = document.getElementById("settings-form");
  const statusBanner = document.getElementById("status");

  // Dynamic fields toggle based on selected provider
  function updateUI() {
    const provider = providerSelect.value;
    if (provider === "gemini") {
      geminiGroup.style.display = "block";
      groqGroup.style.display = "none";
      groqModelGroup.style.display = "none";
    } else {
      geminiGroup.style.display = "none";
      groqGroup.style.display = "block";
      groqModelGroup.style.display = "block";
    }
  }

  providerSelect.addEventListener("change", updateUI);

  // Load saved settings
  chrome.storage.local.get({
    provider: "gemini",
    geminiApiKey: "",
    groqApiKey: "",
    groqModel: "llama-3.3-70b-versatile",
    language: "Turkish",
    detailLevel: "detailed"
  }, (items) => {
    providerSelect.value = items.provider;
    geminiKeyInput.value = items.geminiApiKey;
    groqKeyInput.value = items.groqApiKey;
    groqModelSelect.value = items.groqModel;
    languageSelect.value = items.language;
    detailSelect.value = items.detailLevel;
    updateUI();
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

  // Save settings
  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const provider = providerSelect.value;
    const geminiApiKey = geminiKeyInput.value.trim();
    const groqApiKey = groqKeyInput.value.trim();
    const groqModel = groqModelSelect.value;
    const language = languageSelect.value;
    const detailLevel = detailSelect.value;

    chrome.storage.local.set({
      provider,
      geminiApiKey,
      groqApiKey,
      groqModel,
      language,
      detailLevel
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
