const stage = document.querySelector("#stage");
const progress = document.querySelector("#progress");
const topbar = document.querySelector(".topbar");
const menuToggle = document.querySelector("#menuToggle");
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
const playerPrev = document.querySelector("#playerPrev");
const playerNext = document.querySelector("#playerNext");
const fullscreenToggle = document.querySelector("#fullscreenToggle");
const fullscreenExit = document.querySelector("#fullscreenExit");
const volumeSlider = document.querySelector("#volumeSlider");
const qualitySelect = document.querySelector("#qualitySelect");
let activePlayer = "direct";
let currentVideoIndex = 0;
let youtubePlaying = false;
let suppressNextClick = false;
let previewObserver;

// Add each portfolio item here.
// thumbnail can be a local file such as "thumbnails/video-01.jpg" or a hosted image URL.
// preview can be a GIF such as "thumbnails/video-01-preview.gif" for hover animation.
// Leave thumbnail blank to use Google Drive's generated thumbnail.
const videos = [
  {
    title: "ZRAW Cut 01",
    category: "Edit Reel",
    year: "2026",
    youtubeId: "uFJPprYX3gw",
    driveId: "",
    thumbnail: "",
    preview: "",
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
    thumbnail: "thumbnails/zraw-cut-02-thumb.jpg",
    preview: "thumbnails/zraw-cut-02-preview.gif",
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
    preview: "",
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
      preview: "",
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
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
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

function previewFor(video) {
  return video.preview || "";
}

function cssUrl(value) {
  return value.replaceAll("'", "%27");
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

function setPreviewCard(card) {
  if (!card) return;
  videoStrip?.querySelectorAll(".video-card.is-previewing").forEach((item) => {
    if (item !== card) item.classList.remove("is-previewing");
  });
  card.classList.add("is-previewing");
}

function setupPreviewObserver() {
  if (!videoStrip || !("IntersectionObserver" in window)) return;

  previewObserver?.disconnect();
  previewObserver = new IntersectionObserver(
    (entries) => {
      const activeEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (activeEntry) setPreviewCard(activeEntry.target);
    },
    {
      root: videoStrip,
      threshold: [0.45, 0.65, 0.85],
    }
  );

  videoStrip.querySelectorAll(".video-card").forEach((card) => {
    previewObserver.observe(card);
  });

  setPreviewCard(videoStrip.querySelector(".video-card"));
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

function playAfterEmbedLoad() {
  window.setTimeout(() => {
    postToEmbed("playVideo");
    postToEmbed("setVolume", [Math.round(Number(volumeSlider.value) * 100)]);
  }, 450);
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
      const thumb = cssUrl(thumbFor(video));
      const preview = cssUrl(previewFor(video));
      const vars = [
        thumb ? `--thumb: url('${thumb}')` : "",
        preview ? `--preview: url('${preview}')` : "",
      ].filter(Boolean).join("; ");
      const style = vars ? ` style="${vars}"` : "";
      return `
        <article class="video-card"${style} data-video-index="${index}" role="button" tabindex="0" aria-label="Play ${video.title}">
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
  setupPreviewObserver();
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

function openPlayer(video, index = currentVideoIndex) {
  currentVideoIndex = index;
  loadVideo(video);
  playerShell.classList.add("is-open");
  playerShell.setAttribute("aria-hidden", "false");
  document.body.classList.add("player-open");
  scrollToVideo(currentVideoIndex);
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

function openPlayerAt(index, autoplay = false) {
  const nextIndex = (index + videos.length) % videos.length;
  currentVideoIndex = nextIndex;
  openPlayer(videos[nextIndex], nextIndex);

  if (!autoplay) return;

  if (activePlayer === "youtube") {
    youtubePlaying = true;
    playToggle.textContent = "Pause";
    playAfterEmbedLoad();
    return;
  }

  if (featureVideo.src) {
    featureVideo.play().catch(fallbackToDriveEmbed);
    playToggle.textContent = "Pause";
  }
}

function openAdjacentVideo(direction) {
  openPlayerAt(currentVideoIndex + direction, true);
}

function toggleFullscreen() {
  const target = document.querySelector(".video-frame");

  if (!document.fullscreenElement) {
    target.requestFullscreen?.();
    fullscreenToggle.textContent = "Exit";
    return;
  }

  document.exitFullscreen?.();
  fullscreenToggle.textContent = "Full";
}

renderVideos();

menuToggle?.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  topbar?.classList.toggle("is-open", willOpen);
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    topbar?.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

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
  let pointerMoved = false;

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a, input, select")) return;
    if (event.target.closest(".video-card")) return;
    isDown = true;
    startX = event.pageX;
    scrollLeft = stage.scrollLeft;
    pointerMoved = false;
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!isDown) return;
    if (Math.abs(event.pageX - startX) > 8) {
      pointerMoved = true;
    }
    stage.scrollLeft = scrollLeft - (event.pageX - startX);
  });

  stage.addEventListener("pointerup", (event) => {
    const card = event.target.closest("[data-video-index]");
    if (card && !pointerMoved) {
      const index = Number(card.dataset.videoIndex);
      openPlayer(videos[index], index);
      suppressNextClick = true;
    }
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
  event.preventDefault();
  event.stopPropagation();
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  const button = event.target.closest("[data-video-index]");
  if (!button) return;
  const index = Number(button.dataset.videoIndex);
  openPlayer(videos[index], index);
});

videoStrip?.addEventListener(
  "pointerover",
  (event) => {
    setPreviewCard(event.target.closest(".video-card"));
  },
  { passive: true }
);

videoStrip?.addEventListener(
  "touchstart",
  (event) => {
    setPreviewCard(event.target.closest(".video-card"));
  },
  { passive: true }
);

videoStrip?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-video-index]");
  if (!card) return;
  event.preventDefault();
  const index = Number(card.dataset.videoIndex);
  openPlayer(videos[index], index);
});

document.querySelectorAll("[data-close-player]").forEach((button) => {
  button.addEventListener("click", closePlayer);
});

playToggle?.addEventListener("click", togglePlay);

playerPrev?.addEventListener("click", () => {
  openAdjacentVideo(-1);
});

playerNext?.addEventListener("click", () => {
  openAdjacentVideo(1);
});

fullscreenToggle?.addEventListener("click", toggleFullscreen);

fullscreenExit?.addEventListener("click", () => {
  document.exitFullscreen?.();
});

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

document.addEventListener("fullscreenchange", () => {
  fullscreenToggle.textContent = document.fullscreenElement ? "Exit" : "Full";
});
