const stage = document.querySelector("#stage");
const progress = document.querySelector("#progress");
const videoStrip = document.querySelector("#videoStrip");
const videoPrev = document.querySelector("#videoPrev");
const videoNext = document.querySelector("#videoNext");
const playerShell = document.querySelector("#playerShell");
const featureVideo = document.querySelector("#featureVideo");
const drivePlayer = document.querySelector("#drivePlayer");
const videoFallback = document.querySelector("#videoFallback");
const playerTitle = document.querySelector("#playerTitle");
const playerCategory = document.querySelector("#playerCategory");
const playToggle = document.querySelector("#playToggle");
const volumeSlider = document.querySelector("#volumeSlider");
const qualitySelect = document.querySelector("#qualitySelect");
let activePlayer = "direct";
let youtubePlaying = false;

// Add each portfolio item here.
// thumbnail can be a local file such as "thumbnails/video-01.jpg" or a hosted image URL.
// Leave thumbnail blank to use Google Drive's generated thumbnail.
const videos = [
  {
    title: "ZRAW Cut 01",
    category: "Edit Reel",
    year: "2026",
    youtubeId: "uFJPprYX3gw",
    driveId: "",
    thumbnail: "",
    sources: {
      "1080p": "",
      "720p": "",
    },
  },
  {
    title: "ZRAW Cut 02",
    category: "Commercial",
    year: "2026",
    driveId: "1hFof8Tl1nU7YVeP6VtE7xfk2IFYkYZiB",
    thumbnail: "",
    sources: {
      "1080p": "",
      "720p": "",
    },
  },
  {
    title: "ZRAW Cut 03",
    category: "Event Film",
    year: "2026",
    driveId: "1xuLg3pyY5XQe7w8aluM4gO5TLGxsxhsn",
    thumbnail: "",
    sources: {
      "1080p": "",
      "720p": "",
    },
  },
  ...Array.from({ length: 21 }, (_, index) => {
    const number = index + 4;
    return {
      title: `ZRAW Cut ${String(number).padStart(2, "0")}`,
      category: number % 3 === 0 ? "Event Film" : number % 2 === 0 ? "Commercial" : "Edit Reel",
      year: "2026",
      driveId: "",
      thumbnail: "",
      sources: {
        "1080p": "",
        "720p": "",
      },
    };
  }),
];

function driveVideoUrl(fileId) {
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : "";
}

function drivePreviewUrl(fileId) {
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : "";
}

function driveThumbUrl(fileId) {
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600` : "";
}

function youtubeVideoUrl(videoId) {
  const pageOrigin = window.location.origin.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:4173";
  const params = new URLSearchParams({
    enablejsapi: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    origin: pageOrigin,
    widget_referrer: pageOrigin,
  });
  return videoId ? `https://www.youtube.com/embed/${videoId}?${params}` : "";
}

function youtubeThumbUrl(videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "";
}

function thumbFor(video) {
  return video.thumbnail || youtubeThumbUrl(video.youtubeId) || driveThumbUrl(video.driveId);
}

function isDriveEntry(video) {
  return !Object.values(video.sources || {}).some(Boolean) && Boolean(video.driveId);
}

function activeVideoIndex() {
  if (!videoStrip) return 0;
  const cards = [...videoStrip.querySelectorAll(".video-card")];
  const stripCenter = videoStrip.scrollLeft + videoStrip.clientWidth / 2;
  return cards.reduce((best, card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const distance = Math.abs(stripCenter - cardCenter);
    return distance < best.distance ? { index, distance } : best;
  }, { index: 0, distance: Infinity }).index;
}

function scrollToVideo(index) {
  const cards = [...videoStrip.querySelectorAll(".video-card")];
  const card = cards[Math.max(0, Math.min(index, cards.length - 1))];
  if (!card) return;
  videoStrip.scrollTo({
    left: card.offsetLeft - (videoStrip.clientWidth - card.offsetWidth) / 2,
    behavior: "smooth",
  });
}

function fallbackToDriveEmbed() {
  const driveUrl = drivePreviewUrl(featureVideo.dataset.driveId);
  if (!driveUrl) return;
  featureVideo.pause();
  featureVideo.hidden = true;
  drivePlayer.hidden = false;
  drivePlayer.src = driveUrl;
  playToggle.textContent = "Drive Player";
  playToggle.disabled = true;
  volumeSlider.disabled = true;
  qualitySelect.disabled = true;
}

function restoreCustomPlayer() {
  featureVideo.hidden = false;
  drivePlayer.hidden = true;
  drivePlayer.removeAttribute("src");
  playToggle.disabled = false;
  volumeSlider.disabled = false;
  qualitySelect.disabled = false;
}

function postToEmbed(command, args = []) {
  if (!drivePlayer.contentWindow) return;
  drivePlayer.contentWindow.postMessage(
    JSON.stringify({
      event: "command",
      func: command,
      args,
    }),
    "*"
  );
}

function showYoutubePlayer(video) {
  activePlayer = "youtube";
  youtubePlaying = false;
  featureVideo.hidden = true;
  drivePlayer.hidden = false;
  videoFallback.hidden = true;
  document.querySelector(".player-controls").hidden = false;
  drivePlayer.src = youtubeVideoUrl(video.youtubeId);
  playToggle.disabled = false;
  volumeSlider.disabled = false;
  qualitySelect.disabled = false;
  qualitySelect.innerHTML = "";

  [
    ["default", "Auto"],
    ["hd1080", "1080p"],
    ["hd720", "720p"],
    ["large", "480p"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    qualitySelect.append(option);
  });

  playToggle.textContent = "Play";
}

function showEmptyPlayer() {
  activePlayer = "empty";
  featureVideo.hidden = true;
  drivePlayer.hidden = true;
  videoFallback.hidden = false;
  document.querySelector(".player-controls").hidden = true;
}

function showCustomControls(entries) {
  activePlayer = "direct";
  document.querySelector(".player-controls").hidden = false;
  videoFallback.hidden = true;
  restoreCustomPlayer();
  playToggle.disabled = entries.length === 0;
  volumeSlider.disabled = entries.length === 0;
  qualitySelect.disabled = entries.length <= 1;
}

function directEntriesFor(video) {
  const entries = Object.entries(video.sources || {}).filter(([, url]) => url);
  if (entries.length) return entries;
  const driveUrl = driveVideoUrl(video.driveId);
  return driveUrl ? [["Drive", driveUrl]] : [];
}

function syncProgress() {
  if (!stage || !progress) return;
  const max = stage.scrollWidth - stage.clientWidth;
  progress.style.width = max <= 0 ? "0%" : `${(stage.scrollLeft / max) * 100}%`;
}

function renderVideos() {
  if (!videoStrip) return;

  videoStrip.innerHTML = videos
    .map((video, index) => {
      const thumb = thumbFor(video).replaceAll("'", "%27");
      const style = thumb ? ` style="--thumb: url('${thumb}')"` : "";
      return `
        <article class="video-card"${style}>
          <button class="video-open" type="button" data-video-index="${index}" aria-label="Play ${video.title}">
            <span class="play-glyph"></span>
          </button>
          <div class="video-meta">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <p>${video.category}</p>
            <h3>${video.title}</h3>
            <small>${video.year}</small>
          </div>
        </article>
      `;
    })
    .join("");
}

function loadVideo(video) {
  const entries = directEntriesFor(video);

  featureVideo.pause();
  featureVideo.removeAttribute("src");
  delete featureVideo.dataset.driveId;
  featureVideo.innerHTML = "";
  drivePlayer.removeAttribute("src");
  qualitySelect.innerHTML = "";

  playerTitle.textContent = video.title;
  playerCategory.textContent = video.category;

  if (video.youtubeId) {
    showYoutubePlayer(video);
    return;
  }

  if (!entries.length) {
    showEmptyPlayer();
    playToggle.textContent = "Play";
    return;
  }

  showCustomControls(entries);
  if (isDriveEntry(video)) {
    featureVideo.dataset.driveId = video.driveId;
  }

  entries.forEach(([label, url], index) => {
    const option = document.createElement("option");
    option.value = url;
    option.textContent = label;
    qualitySelect.append(option);

    if (index === 0) {
      featureVideo.src = url;
    }
  });

  featureVideo.volume = Number(volumeSlider.value);
  playToggle.textContent = "Play";
}

function openPlayer(video) {
  loadVideo(video);
  playerShell.classList.add("is-open");
  playerShell.setAttribute("aria-hidden", "false");
  document.body.classList.add("player-open");
}

function closePlayer() {
  playerShell.classList.remove("is-open");
  playerShell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("player-open");
  featureVideo.pause();
  drivePlayer.removeAttribute("src");
  activePlayer = "direct";
  youtubePlaying = false;
  playToggle.textContent = "Play";
}

function togglePlay() {
  if (activePlayer === "youtube") {
    youtubePlaying = !youtubePlaying;
    postToEmbed(youtubePlaying ? "playVideo" : "pauseVideo");
    playToggle.textContent = youtubePlaying ? "Pause" : "Play";
    return;
  }

  if (!featureVideo.src) return;
  if (featureVideo.paused) {
    featureVideo.play().catch(fallbackToDriveEmbed);
    playToggle.textContent = "Pause";
  } else {
    featureVideo.pause();
    playToggle.textContent = "Play";
  }
}

renderVideos();

if (stage) {
  stage.addEventListener(
    "wheel",
    (event) => {
      if (document.body.classList.contains("player-open")) return;
      if (window.matchMedia("(max-width: 900px)").matches) return;
      event.preventDefault();
      if (event.target.closest(".video-strip")) {
        videoStrip.scrollBy({
          left: event.deltaY + event.deltaX,
          behavior: "smooth",
        });
        return;
      }
      stage.scrollBy({
        left: event.deltaY + event.deltaX,
        behavior: "smooth",
      });
    },
    { passive: false }
  );

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a, input, select")) return;
    isDown = true;
    startX = event.pageX;
    scrollLeft = stage.scrollLeft;
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!isDown) return;
    stage.scrollLeft = scrollLeft - (event.pageX - startX);
  });

  stage.addEventListener("pointerup", () => {
    isDown = false;
  });

  stage.addEventListener("scroll", syncProgress);
  window.addEventListener("resize", syncProgress);
  syncProgress();
}

videoPrev?.addEventListener("click", () => {
  scrollToVideo(activeVideoIndex() - 1);
});

videoNext?.addEventListener("click", () => {
  scrollToVideo(activeVideoIndex() + 1);
});

videoStrip?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-video-index]");
  if (!button) return;
  openPlayer(videos[Number(button.dataset.videoIndex)]);
});

document.querySelectorAll("[data-close-player]").forEach((button) => {
  button.addEventListener("click", closePlayer);
});

playToggle?.addEventListener("click", togglePlay);

featureVideo?.addEventListener("error", fallbackToDriveEmbed);

featureVideo?.addEventListener("play", () => {
  playToggle.textContent = "Pause";
});

featureVideo?.addEventListener("pause", () => {
  playToggle.textContent = "Play";
});

volumeSlider?.addEventListener("input", () => {
  if (activePlayer === "youtube") {
    postToEmbed("setVolume", [Math.round(Number(volumeSlider.value) * 100)]);
    return;
  }
  featureVideo.volume = Number(volumeSlider.value);
});

qualitySelect?.addEventListener("change", () => {
  if (activePlayer === "youtube") {
    postToEmbed("setPlaybackQuality", [qualitySelect.value]);
    return;
  }

  const wasPlaying = !featureVideo.paused;
  const currentTime = featureVideo.currentTime;
  featureVideo.src = qualitySelect.value;
  featureVideo.addEventListener(
    "loadedmetadata",
    () => {
      featureVideo.currentTime = Math.min(currentTime, featureVideo.duration || currentTime);
      if (wasPlaying) featureVideo.play();
    },
    { once: true }
  );
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && playerShell.classList.contains("is-open")) {
    closePlayer();
  }
});
