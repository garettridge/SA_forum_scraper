function waitForSelector(container, selector, { timeout = 10000, interval = 200, all = false } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      let found = all
        ? container.querySelectorAll(selector)
        : container.querySelector(selector);

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

function findTweetContainer(innerDiv) {
    let container = innerDiv?.parentElement;
    while (container && !container.querySelector('div[data-testid="User-Name"]')) {
      container = container.parentElement;
    }
  return container;
}

let imageCounter = 0;
function extract_media( container, tweetId ) {
  if (!container)
    return [];
  const mediaUrls = Array.from(container.querySelectorAll('div[data-testid="tweetPhoto"] img')).map(img =>
      ( { url: img.src, filename: `${tweetId}_img${imageCounter++}.jpg` } )
    );

  // Similarly for video URLs (use <video> sources or poster attribute)
  const videoEls = container.querySelectorAll('video');
  videoEls.forEach(video => {
    const source = video.querySelector('source');
    if (source?.src && !source.src.startsWith('blob:')) {
      mediaUrls.push({ url: source.src, filename: `${tweetId}_img${imageCounter++}.jpg` });
    } else if (video.poster) {
      mediaUrls.push({ url: video.poster, filename: `${tweetId}_img${imageCounter++}.jpg` });
    }
  });
  return mediaUrls;
}

(async () => {
  try {
    let mainHTML = '', quoteHTML = '', authorMedia, quotedMedia;
    const tweetTextEls = await waitForSelector(document, 'div[data-testid="tweetText"]', {all: true});
    if (tweetTextEls.length > 0) mainHTML = tweetTextEls[0].innerHTML;
    if (tweetTextEls.length > 1) quoteHTML = tweetTextEls[1].innerHTML;

    const mainTweet = findTweetContainer(tweetTextEls[0]);
    const quotedTweet = findTweetContainer(tweetTextEls[1]);

    const timeEls = Array.from( await waitForSelector(mainTweet, 'time', {all: true}) );
    const timeEl = timeEls.find( e => e.parentElement?.tagName.toLowerCase() === 'a' );  // Main tweet's time, not quote tweet's
    const tweetTime = timeEl.getAttribute('datetime') || timeEl.textContent.trim() || '';
    const href = timeEl.parentElement.getAttribute('href');
    const tweetUrl = href.startsWith('/') ? `https://twitter.com${href}` : href;
    const tweetId = tweetUrl.match(/status\/(\d+)/)?.[1] || 'unknown';

    const usernames = await waitForSelector(document, 'div[data-testid="User-Name"]', {all: true});
    const authorInfo = parseAuthorInfo(usernames[0].innerText);
    let quotedData = null;
    if (tweetTextEls.length > 1) {
      quotedData = parseAuthorInfo(usernames[1].innerText);
    }
    const quotedName = quotedData?.name || '';
    const quotedHandle = quotedData?.handle || '';
    const quotedUrl = quotedData?.profileUrl || '';

    if( quotedTweet ) {
      const mediaPlaceholder = quotedTweet.querySelector('a[href*="/photo/"], a[href*="/video/"]');
      if( mediaPlaceholder ) {
        const img = await waitForSelector( quotedTweet, 'img', {timeout: 4000});
        if (img?.src)
          quotedMedia = extract_media ( quotedTweet, tweetId );
      }
      quotedTweet.remove();
    }
    const mediaPlaceholder = mainTweet.querySelector('a[href*="/photo/"], a[href*="/video/"]');
    if( mediaPlaceholder ) {
      const img = await waitForSelector( mainTweet, 'img', {timeout: 4000});
      if (img?.src)
        authorMedia = extract_media ( mainTweet, tweetId );
    }

    debugger;

    chrome.runtime.sendMessage({
      type: 'page-data',
      authorName: authorInfo.name, authorHandle: authorInfo.handle, authorUrl: authorInfo.profileUrl, authorMedia, quotedName, quotedHandle, quotedUrl, quotedMedia, tweetTime, mainHTML, quoteHTML, repliesHTML: [], tweetUrl
    });
  } catch (error) {
    chrome.runtime.sendMessage({ type: 'page-data', error: error.message });
  }
})();

