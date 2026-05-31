// Zen AI Summarizer Popup Script

document.addEventListener("DOMContentLoaded", () => {
  const summarizeBtn = document.getElementById("summarize-btn");
  const optionsBtn = document.getElementById("options-btn");

  // Summarize current page
  summarizeBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      // Trigger summarization message
      chrome.tabs.sendMessage(tab.id, { action: "summarize_page" });
      // Close popup to let the user see the overlay slide in
      window.close();
    }
  });

  // Open options page
  optionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});
