function waitForSelector(selector, { timeout = 10000, interval = 200, all = false } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      let found = all 
        ? document.querySelectorAll(selector)
        : document.querySelector(selector);

      if (all ? found.length > 0 : found) {
        resolve(found);
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for ${selector}`));
      } else {
        setTimeout(check, interval);
      }
    }
    check();
  });
}

function parseAuthorInfo(innerText) {
  const parts = innerText.split('\n').map(s => s.trim()).filter(Boolean);
  const [name, handle] = parts;
  const profileUrl = handle ? `https://twitter.com/${handle.replace(/^@/, '')}` : null;
  return { name, handle, profileUrl };
}

(async () => {
  try {

    let mainHTML = '', quoteHTML = '', tweetUrl = '';
    const tweetTextEls = await waitForSelector('div[data-testid="tweetText"]', {all: true});
    if (tweetTextEls.length > 0) mainHTML = tweetTextEls[0].innerHTML;
    if (tweetTextEls.length > 1) quoteHTML = tweetTextEls[1].innerHTML;

    const usernames = await waitForSelector('div[data-testid="User-Name"]', {all: true});

    const authorInfo = parseAuthorInfo(usernames[0].innerText);
    let quotedData = null;
    if (tweetTextEls.length > 1) {
      quotedData = parseAuthorInfo(usernames[1].innerText);
    }
    const quotedName = quotedData?.name || '';
    const quotedHandle = quotedData?.handle || '';
    const quotedUrl = quotedData?.profileUrl || '';

    const timeEl = await waitForSelector('time');
    let tweetTime = timeEl.getAttribute('datetime') || timeEl.textContent.trim() || '';
    if (timeEl.parentElement?.tagName.toLowerCase() === 'a') {
      const href = timeEl.parentElement.getAttribute('href');
      tweetUrl = href.startsWith('/') ? `https://twitter.com${href}` : href;
    }

//    const quoteEl = document.querySelector('[data-testid="tweet"] article div[lang]:not([data-testid="tweetText"])');
//    quoteHTML = `<div class="quoted-tweet">${quoteEl?.innerHTML}</div>`;

    chrome.runtime.sendMessage({
      type: 'page-data',
      authorName: authorInfo.name, authorHandle: authorInfo.handle, authorUrl: authorInfo.profileUrl, quotedName, quotedHandle, quotedUrl, tweetTime, mainHTML, quoteHTML, repliesHTML: [], tweetUrl
    });
  } catch (error) {
    chrome.runtime.sendMessage({ type: 'page-data', error: error.message });
  }
})();

