(async function () {
  console.log("✅ scraper.js loaded @", location.href);

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function cleanText(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  }

  function getPosts() {
    const posts = [];
    const postEls = document.querySelectorAll('table.post');
    console.log(`👀 Found ${postEls.length} post tables`);

    if (postEls.length === 0) {
      // Optionally dump body HTML to verify whether it's loaded
      console.log("⚠️ No .post tables found. Dumping snippet for inspection:");
      console.log(document.body.innerHTML.slice(0, 1000)); // or more if needed
    }

    postEls.forEach(postEl => {
      const postId = postEl.getAttribute('id')?.replace('post', '') || 'unknown';
      const author = cleanText(postEl.querySelector('dt.author')?.textContent);
      const timestamp = cleanText(postEl.querySelector('td.postdate')?.textContent);

      const bodyEl = postEl.querySelector('td.postbody');
      const contentClone = bodyEl?.cloneNode(true);
      if (!contentClone) return;
      const imageTags = [...contentClone.querySelectorAll('img')];
      const images = [];

      imageTags.forEach(img => {
        const src = img.src;

        if (
          src.includes("avatars") ||
          src.includes("safs/titles") ||
          src.includes("gangtags") ||
          src.includes("newbie.gif") ||
          src.includes("title-banned.gif")
        ) {
          img.remove();
          return;
        }

        let filename = src.split('/').pop().split('?')[0];
        if (!filename || filename.length > 150) filename = `img_${Math.random().toString(36).slice(2)}.jpg`;

        img.src = `images/${filename}`;
        images.push({ url: src, filename });
      });

      const links = [...contentClone.querySelectorAll('a[href^="http"]')];
      links.forEach(link => {
        const href = link.href;
        if (href.includes("twitter.com")) {
          link.setAttribute('data-archive-later', 'tweet');
        } else {
          link.setAttribute('data-archive-later', 'external');
        }
      });

      const html = `<div class="postbox">
        <div class="meta"><strong>${author}</strong> - ${timestamp} [#${postId}]</div>
        <div class="body">${contentClone.innerHTML}</div>
      </div>`;

      posts.push({ postId, html, images });
    });

    return posts;
  }

  // 🧠 Wait for posts to render (up to 5 seconds)
  let attempts = 0;
  while (document.querySelectorAll('table.post').length === 0 && attempts < 20) {
    console.log("⏳ Waiting for posts to appear...");
    await sleep(1000);
    attempts++;
  }

  const data = getPosts();
  console.log(`📦 Extracted ${data.length} posts`);

  chrome.runtime.sendMessage({
    action: "page-data",
    data
  });
})();

