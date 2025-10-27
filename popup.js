document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startButton');
  const pauseBtn = document.getElementById('pauseButton');
  const resumeBtn = document.getElementById('resumeButton');
  const statusText = document.getElementById('status');
  const progressContainer = document.getElementById('progressContainer');
  const progressLabel = document.getElementById('progressLabel');
  const maxPagesInput = document.getElementById('maxPagesInput');

  let isRunning = false;
  let resumePage = null;

  function updateButtons() {
    const canResume = resumePage !== null;

    startBtn.disabled  = isRunning || isPaused;                 // can't Start while running or paused
    pauseBtn.disabled  = !isRunning;                            // only pause when running
    resumeBtn.disabled = isRunning || (!isPaused && !canResume);
  }


  // Initial load
  chrome.runtime.sendMessage({ command: 'getStatusAndResume' }, response => {
    isRunning = response?.isRunning || false;
    isPaused = response?.isPaused || false;
    resumePage = (typeof response?.resumePage === "number" && response.resumePage >= 0)
      ? response.resumePage
      : null;

    // Status + progress
    if (isRunning) {
      statusText.textContent = 'Scraping in progress...';
      progressContainer.style.display = 'block';
    } else if (isPaused) {
      statusText.textContent = 'Paused.';
      progressContainer.style.display = 'block';
    } else if (resumePage !== null) {
      statusText.textContent = `Can resume from page ${resumePage + 1}`;
      progressContainer.style.display = 'block';
    } else {
      statusText.textContent = 'Ready to start new archive';
      progressContainer.style.display = 'none';
    }

    updateButtons();
  });

  startBtn.addEventListener('click', () => {
    const startPage = parseInt(startPageInput.value, 10) || 1;
    const maxPages = parseInt(maxPagesInput.value, 10) || 1;
    chrome.runtime.sendMessage({ command: 'start-scrape', startPage, maxPages });
    isRunning = true;
    updateButtons();
    progressContainer.style.display = 'block';
    statusText.textContent = 'Scraping started...';
    progressLabel.textContent = `0 / ${maxPages}`;
  });

  pauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'pause' });
    isRunning = false;
    updateButtons();
    statusText.textContent = 'Paused.';
  });

  resumeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'resume' });
    isRunning = true;
    updateButtons();
    statusText.textContent = 'Resuming scraping...';
  });

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'status') {
      statusText.textContent = msg.text;
    }
    if (msg.type === 'progressUpdate') {
      progressLabel.textContent = `${msg.page} / ${msg.max}`;
      progressContainer.style.display = 'block';
    }
  });

});

