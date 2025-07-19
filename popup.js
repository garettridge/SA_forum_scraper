// Pre-fill the thread URL based on current tab
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const url = tabs[0]?.url || '';
  if (url.includes("showthread.php?threadid=")) {
    document.getElementById("start-url").value = url;
  }
});

document.getElementById("start-scrape").addEventListener("click", () => {
  const url = document.getElementById("start-url").value.trim();

  if (!url.includes("somethingawful.com/showthread.php?threadid=")) {
    alert("Invalid SA thread URL.");
    return;
  }

  chrome.runtime.sendMessage({ action: "start-scrape", url });
  document.getElementById("status").textContent = "Scraping started. Check debug console for progress.";
  document.getElementById("start-scrape").disabled = true;
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'status') {
    document.getElementById('status').textContent = msg.msg;

    if (msg.msg.includes("complete")) {
      document.getElementById("start-scrape").disabled = false;
    }
  }
});

