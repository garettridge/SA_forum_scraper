let currentTabId = null;
let pageDataResolver = null;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function randomDelay(minMs, maxMs) {
  return delay(minMs + Math.floor(Math.random() * (maxMs - minMs)));
}
function downloadFile(options) {
  return new Promise(resolve => chrome.downloads.download(options, resolve));
}
function fetchBlob(url) {
  return fetch(url).then(r => r.blob());
}
function waitForTabLoad(tabId) {
  return new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

async function scrapeThread(startUrl) {
  const threadIdMatch = startUrl.match(/threadid=(\d+)/);
  if (!threadIdMatch) {
    console.error("Invalid SA thread URL.");
    return;
  }

  const threadId = threadIdMatch[1];
  const maxPages = 5;
  const threadDir = `SA_Thread_${threadId}`;
  const baseUrl = `https://forums.somethingawful.com/showthread.php?threadid=${threadId}&pagenumber=`;

  const [tab] = await new Promise(resolve =>
    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
  );

  currentTabId = tab.id;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `${baseUrl}${pageNum}`;
    console.log(`➡️ Navigating to page ${pageNum}: ${url}`);
    chrome.tabs.update(currentTabId, { url });

    await waitForTabLoad(currentTabId);

    await new Promise((resolve, reject) => {
      chrome.tabs.executeScript(currentTabId, {
        file: "scraper.js",
        runAt: "document_idle", // or "document_end"
        allFrames: false
      }, result => {
        if (chrome.runtime.lastError) {
          console.error("❌ Failed to inject scraper.js:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log("📥 scraper.js injected");
          resolve(result);
        }
      });
    });

    const pageData = await new Promise(resolve => {
      pageDataResolver = resolve;
    });

    if (!pageData || pageData.length === 0) {
      console.log(`✅ No posts found on page ${pageNum}, stopping.`);
      break;
    }

    const htmlParts = pageData.map(post => post.html).join('\n');
    const filename = `${threadDir}/page${String(pageNum).padStart(4, '0')}.html`;

    const htmlBlob = new Blob([
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Thread ${threadId} - Page ${pageNum}</title>
  <style>
    body { font-family: sans-serif; padding: 40px; max-width: 900px; margin: auto; }
    .postbox { margin-bottom: 3em; border-bottom: 1px solid #ccc; padding-bottom: 1em; }
    .meta { font-size: 0.9em; color: #666; margin-bottom: 5px; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${htmlParts}
</body>
</html>`.trim()
    ], { type: "text/html" });

    const htmlURL = URL.createObjectURL(htmlBlob);
    await downloadFile({ url: htmlURL, filename, saveAs: false });
    console.log(`💾 Saved HTML: ${filename}`);

    for (const post of pageData) {
      for (const img of post.images) {
        try {
          const imgBlob = await fetchBlob(img.url);
          const blobUrl = URL.createObjectURL(imgBlob);
          const imgFile = `${threadDir}/images/${img.filename}`;
          await downloadFile({ url: blobUrl, filename: imgFile, saveAs: false });
          console.log(`🖼 Saved image: ${imgFile}`);
          await delay(250 + Math.random() * 300);
        } catch (err) {
          console.warn(`⚠️ Failed to download: ${img.url}`);
        }
      }
    }

    chrome.runtime.sendMessage({
      action: 'status',
      msg: `✅ Page ${pageNum} archived`
    });

    await randomDelay(5000, 10000);
  }

  console.log("🎉 Finished thread scraping.");
  currentTabId = null;
  pageDataResolver = null;
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  console.log("[BG] Received message", msg, sender);
  if (msg.action === "start-scrape") {
    if (!msg.url) return;
    console.log("[BG] Starting scrape…");
    scrapeThread(msg.url);
  }

  if (msg.action === "page-data" && pageDataResolver) {
    console.log(`[BG] Got page data (sender tab: ${sender.tab?.id})`);
    pageDataResolver(msg.data);
    pageDataResolver = null;
  }
});

