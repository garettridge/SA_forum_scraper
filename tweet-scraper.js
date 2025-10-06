function waitForSelector(selector, timeout = 10000, interval = 200) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const el = document.querySelector(selector);
      if (el) resolve(el);
      else if (Date.now() - start > timeout) reject(new Error(`Timeout waiting for ${selector}`));
      else setTimeout(check, interval);
    }
    check();
  });
}

(async () => {
  try {

    let mainHTML = '', quoteHTML = '', tweetUrl = '';
    const tweetTextEls = document.querySelectorAll('div[data-testid="tweetText"]');
    if (tweetTextEls.length > 0) mainHTML = tweetTextEls[0].innerHTML;
    if (tweetTextEls.length > 1) quoteHTML = tweetTextEls[1].innerHTML;


    const timeEl = await waitForSelector('time');
    let tweetTime = timeEl.getAttribute('datetime') || timeEl.textContent.trim() || '';
    if (timeEl.parentElement?.tagName.toLowerCase() === 'a') {
      const href = timeEl.parentElement.getAttribute('href');
      tweetUrl = href.startsWith('/') ? `https://twitter.com${href}` : href;
    }

    const quoteEl = document.querySelector('[data-testid="tweet"] article div[lang]:not([data-testid="tweetText"])');
    quoteHTML = `<div class="quoted-tweet">${quoteEl?.innerHTML}</div>`;

    const userBlock = await waitForSelector('[data-testid="User-Name"]');
    const authorName = userBlock.innerText.trim();
    const handleLink = userBlock.querySelector('a[href^="/"]');
    const authorHandle = handleLink ? (handleLink.getAttribute('href').match(/^\/([^/]+)/)[1]) : '';


    chrome.runtime.sendMessage({
      type: 'page-data',
      authorName, authorHandle, tweetTime, mainHTML, quoteHTML, repliesHTML: [], tweetUrl,
    });
  } catch (error) {
    chrome.runtime.sendMessage({ type: 'page-data', error: error.message });
  }
})();

