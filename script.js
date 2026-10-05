const stage = document.querySelector("#stage");
const progress = document.querySelector("#progress");
const topbar = document.querySelector(".topbar");
const menuToggle = document.querySelector("#menuToggle");
const backgroundMusic = document.querySelector("#backgroundMusic");
const soundToggle = document.querySelector("#soundToggle");
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
const qrNameInput = document.querySelector("#qrNameInput");
const qrUrlInput = document.querySelector("#qrUrlInput");
const qrGenerateBtn = document.querySelector("#qrGenerateBtn");
const qrDownloadBtn = document.querySelector("#qrDownloadBtn");
const qrCopyBtn = document.querySelector("#qrCopyBtn");
const qrStatus = document.querySelector("#qrStatus");
const qrEmptyState = document.querySelector("#qrEmptyState");
const qrCanvas = document.querySelector("#qrCanvas");
const contactForm = document.querySelector("#contactForm");
const contactName = document.querySelector("#contactName");
const contactEmail = document.querySelector("#contactEmail");
const contactMessage = document.querySelector("#contactMessage");
const contactStatus = document.querySelector("#contactStatus");
const CONTACT_EMAIL = "zraw.services@gmail.com";
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xaqkydoe";
const BACKGROUND_MUSIC_VOLUME = 0.30;
let activePlayer = "direct";
let currentVideoIndex = 0;
let youtubePlaying = false;

let previewObserver;
let userMutedMusic = false;
let mediaQuiet = false;
let currentQrUrl = "";
let currentQrName = "";

// Add each portfolio item here.
// thumbnail can be a local file such as "thumbnails/video-01.jpg" or a hosted image URL.
// preview can be a GIF such as "thumbnails/video-01-preview.gif" for hover animation.
// Leave thumbnail blank to use Google Drive's generated thumbnail.
const videos = [
  {
    title: "LIAN SHANE",
    category: "PREDEBUT",
    year: "2026",
    driveId: "1WqC_G3ucdsaOzmi63YNGZTv9mFEtunN7",
    previewVideo: "thumbnails/1-thumbnail.mp4",
    thumbnail: "",
    preview: "",
    sources: { "1080p": "", "720p": "" },
  },
  {
    title: "KIM & ARLYN",
    category: "PRENUP",
    year: "2026",
    driveId: "1kmXrSjKaC8x8QdiTM-2ENvLjD88cgQdt",
    previewVideo: "thumbnails/2-thumbnail.mp4",
    thumbnail: "",
    preview: "",
    sources: { "1080p": "", "720p": "" },
  },
  {
    title: "PHILLIP & JANA",
    category: "WEDDING",
    year: "2026",
    driveId: "1VAycwNiYYnfjIFPGlbGsXy0Yb7-u5-3N",
    previewVideo: "thumbnails/3-thumbnail.mp4",
    thumbnail: "",
    preview: "",
    sources: { "1080p": "", "720p": "" },
  },
  {
    title: "EDWIN & GHEN",
    category: "WEDDING",
    year: "2026",
    driveId: "15NwI0IQO-j57AtV4Moqu5zQvuzpnW6IW",
    previewVideo: "thumbnails/4-thumbnail.mp4",
    thumbnail: "",
    preview: "",
    sources: { "1080p": "", "720p": "" },
  },
  {
    title: "DIWATA NATURE RESORT",
    category: "COMMERCIAL",
    year: "2026",
    driveId: "1ms6V4JpfyaaOmx-z8UKxdwzvp8K0YUmC",
    previewVideo: "thumbnails/5-thumbnail.mp4",
    thumbnail: "",
    preview: "",
    sources: { "1080p": "", "720p": "" },
  },
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

function shouldPlayBackgroundMusic() {
  return Boolean(backgroundMusic) && !userMutedMusic && !mediaQuiet;
}

function updateSoundToggle() {
  if (!soundToggle) return;

  const isPausedByPage = !userMutedMusic && !shouldPlayBackgroundMusic();
  const isWaitingForClick = !userMutedMusic && shouldPlayBackgroundMusic() && backgroundMusic?.paused;

  soundToggle.classList.toggle("is-muted", userMutedMusic);
  soundToggle.classList.toggle("is-paused", isPausedByPage || isWaitingForClick);
  soundToggle.setAttribute("aria-pressed", String(!userMutedMusic));
  soundToggle.querySelector(".sound-label").textContent = userMutedMusic
    ? "Muted"
    : isWaitingForClick
      ? "Play"
      : isPausedByPage
        ? "Paused"
        : "Sound";
}

function syncBackgroundMusic() {
  if (!backgroundMusic) return;

  backgroundMusic.volume = BACKGROUND_MUSIC_VOLUME;

  if (!shouldPlayBackgroundMusic()) {
    backgroundMusic.pause();
    updateSoundToggle();
    return;
  }

  backgroundMusic.play().catch(() => {
    updateSoundToggle();
  });
  updateSoundToggle();
}

function setQrStatus(message, isError = false) {
  if (!qrStatus) return;
  qrStatus.textContent = message;
  qrStatus.classList.toggle("is-error", isError);
}

function normalizeQrName(value) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Enter a QR code name first.");
  if (name.length > 48) throw new Error("Keep the QR code name under 48 characters.");
  return name;
}

function normalizeQrUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a web URL first.");

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("That does not look like a valid web URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http:// or https:// links are supported.");
  }

  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    throw new Error("Use a complete URL, like https://yourname.com.");
  }

  if (new TextEncoder().encode(url.href).length > 600) {
    throw new Error("That URL is too long. Try a shorter link.");
  }

  return url.href;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawFittedQrText(ctx, text, x, y, maxWidth) {
  let size = 21;
  do {
    ctx.font = `800 ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  } while (size >= 12);
  ctx.fillText(text, x, y);
}

async function drawQrLogo(ctx, qrSize, qrTop) {
  const logo = new Image();
  logo.src = "ZRAW.png";

  try {
    await logo.decode();
  } catch {
    return;
  }

  const badgeSize = 58;
  const pad = 7;
  const x = (qrSize - badgeSize) / 2;
  const y = qrTop + (qrSize - badgeSize) / 2;

  ctx.save();
  drawRoundedRect(ctx, x, y, badgeSize, badgeSize, 12);
  ctx.fillStyle = "#fff";
  ctx.fill();
  drawRoundedRect(ctx, x + pad, y + pad, badgeSize - pad * 2, badgeSize - pad * 2, 8);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.clip();
  ctx.drawImage(logo, x + pad, y + pad, badgeSize - pad * 2, badgeSize - pad * 2);
  ctx.restore();
}

async function renderQrCode(url, qrName) {
  if (!qrCanvas || typeof qrcode !== "function") {
    throw new Error("QR library is not ready yet. Refresh and try again.");
  }

  const qr = qrcode(0, "H");
  qr.addData(url, "Byte");
  qr.make();

  const ctx = qrCanvas.getContext("2d");
  const moduleCount = qr.getModuleCount();
  const scale = Math.max(5, Math.floor(360 / moduleCount));
  const quiet = 4;
  const titleArea = 46;
  const captionArea = 28;
  const qrSize = (moduleCount + quiet * 2) * scale;

  qrCanvas.width = qrSize;
  qrCanvas.height = titleArea + qrSize + captionArea;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawFittedQrText(ctx, qrName, qrCanvas.width / 2, 24, qrCanvas.width - 38);

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) {
        ctx.fillRect((col + quiet) * scale, titleArea + (row + quiet) * scale, scale, scale);
      }
    }
  }

  await drawQrLogo(ctx, qrSize, titleArea);

  ctx.fillStyle = "#777";
  ctx.font = "italic 400 12px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("ZRAW QR Code Generator 2026", qrCanvas.width / 2, titleArea + qrSize + 12);

  qrCanvas.hidden = false;
  if (qrEmptyState) qrEmptyState.hidden = true;
}

async function generateQrCode() {
  try {
    const qrName = normalizeQrName(qrNameInput?.value || "");
    const url = normalizeQrUrl(qrUrlInput?.value || "");

    currentQrName = qrName;
    currentQrUrl = url;
    if (qrNameInput) qrNameInput.value = qrName;
    if (qrUrlInput) qrUrlInput.value = url;

    await renderQrCode(url, qrName);
    if (qrDownloadBtn) qrDownloadBtn.disabled = false;
    if (qrCopyBtn) qrCopyBtn.disabled = !navigator.clipboard || !window.ClipboardItem;
    setQrStatus("QR code ready.");
  } catch (error) {
    currentQrName = "";
    currentQrUrl = "";
    if (qrCanvas) qrCanvas.hidden = true;
    if (qrEmptyState) qrEmptyState.hidden = false;
    if (qrDownloadBtn) qrDownloadBtn.disabled = true;
    if (qrCopyBtn) qrCopyBtn.disabled = true;
    setQrStatus(error.message, true);
  }
}

function clearQrIfIncomplete() {
  if (qrNameInput?.value.trim() && qrUrlInput?.value.trim()) return;
  currentQrName = "";
  currentQrUrl = "";
  if (qrCanvas) qrCanvas.hidden = true;
  if (qrEmptyState) qrEmptyState.hidden = false;
  if (qrDownloadBtn) qrDownloadBtn.disabled = true;
  if (qrCopyBtn) qrCopyBtn.disabled = true;
  setQrStatus("");
}

function setContactStatus(message, isError = false) {
  if (!contactStatus) return;
  contactStatus.textContent = message;
  contactStatus.classList.toggle("is-error", isError);
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
  const mobile = window.matchMedia("(max-width: 900px)").matches;
  const max = mobile
    ? document.documentElement.scrollHeight - window.innerHeight
    : stage.scrollWidth - stage.clientWidth;
  const position = mobile ? window.scrollY : stage.scrollLeft;
  progress.style.width = max <= 0 ? "0%" : `${Math.max(0, Math.min(100, position / max * 100))}%`;
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
  setupVideoThumbnails();
}

// Use previewVideo for MP4 thumbnails; preview remains available for GIFs.
function setupVideoThumbnails() {
  videoStrip.querySelectorAll(".video-card").forEach((card, index) => {
    const source = videos[index].previewVideo;
    if (!source) return;
    const preview = document.createElement("video");
    preview.className = "video-thumbnail";
    preview.muted = true;
    preview.defaultMuted = true;
    preview.loop = true;
    preview.playsInline = true;
    preview.preload = "metadata";
    preview.setAttribute("aria-hidden", "true");
    preview.setAttribute("tabindex", "-1");
    preview.addEventListener("loadeddata", () => preview.classList.add("is-ready"));
    preview.addEventListener("error", () => preview.classList.remove("is-ready"));
    preview.src = source;
    card.prepend(preview);

    let visible = false;
    let hovered = false;
    const sync = () => {
      if ((hovered || card.classList.contains("is-touch-preview")) && visible && !document.hidden && !document.body.classList.contains("player-open")) {
        preview.play().catch(() => {});
      } else {
        preview.pause();
        if (preview.readyState > 0) preview.currentTime = 0;
      }
    };
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) card.classList.remove("is-touch-preview");
        sync();
      }, { threshold: 0.15 });
      observer.observe(card);
    } else {
      visible = true;
      sync();
    }
    document.addEventListener("thumbnailpreviewchange", sync);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) card.classList.remove("is-touch-preview");
      sync();
    });
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    card.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      hovered = true;
      sync();
    });
    card.addEventListener("pointerleave", () => {
      hovered = false;
      sync();
    });
    card.addEventListener("pointercancel", () => {
      hovered = false;
      sync();
    });

  });
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
  mediaQuiet = true;
  syncBackgroundMusic();
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
  mediaQuiet = false;
  syncBackgroundMusic();
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
syncBackgroundMusic();

backgroundMusic?.addEventListener("play", updateSoundToggle);
backgroundMusic?.addEventListener("pause", updateSoundToggle);
backgroundMusic?.addEventListener("volumechange", updateSoundToggle);

["pointerdown", "keydown"].forEach((eventName) => {
  window.addEventListener(eventName, syncBackgroundMusic, { once: true, passive: true });
});

menuToggle?.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  topbar?.classList.toggle("is-open", willOpen);
});

soundToggle?.addEventListener("click", () => {
  if (!backgroundMusic) return;

  if (userMutedMusic) {
    userMutedMusic = false;
    syncBackgroundMusic();
    return;
  }

  if (backgroundMusic.paused && shouldPlayBackgroundMusic()) {
    syncBackgroundMusic();
    return;
  }

  userMutedMusic = !userMutedMusic;
  syncBackgroundMusic();
});

qrGenerateBtn?.addEventListener("click", generateQrCode);

[qrNameInput, qrUrlInput].forEach((field) => {
  field?.addEventListener("input", clearQrIfIncomplete);
  field?.addEventListener("focus", () => {
    if (field.value.trim()) requestAnimationFrame(() => field.select());
  });
  field?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") generateQrCode();
  });
});

qrDownloadBtn?.addEventListener("click", () => {
  if (!qrCanvas || !currentQrUrl) return;
  const link = document.createElement("a");
  const host = new URL(currentQrUrl).hostname.replace(/^www\./, "");
  const label = currentQrName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  link.download = `${label || host}-qr-code.png`;
  link.href = qrCanvas.toDataURL("image/png");
  link.click();
});

qrCopyBtn?.addEventListener("click", async () => {
  if (!qrCanvas) return;

  try {
    const blob = await new Promise((resolve) => qrCanvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setQrStatus("QR image copied.");
  } catch {
    setQrStatus("Copy is not available in this browser. Download still works.", true);
  }
});

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = contactName?.value.trim() || "";
  const email = contactEmail?.value.trim() || "";
  const message = contactMessage?.value.trim() || "";
  const endpoint = contactForm.dataset.formspreeEndpoint || FORMSPREE_ENDPOINT;

  if (!name || !email || !message) {
    setContactStatus("Please complete your name, email, and message.", true);
    return;
  }

  if (!endpoint) {
    setContactStatus("Formspree is not connected yet. Add your Formspree endpoint first.", true);
    return;
  }

  setContactStatus("Sending...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: new FormData(contactForm),
    });

    if (!response.ok) {
      throw new Error("Message failed.");
    }

    contactForm.reset();
    setContactStatus("Message sent. Thank you.");
  } catch {
    setContactStatus("Message could not send. Please try again later.", true);
  }
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
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if (window.matchMedia("(max-width: 900px)").matches) return;
    if (event.target.closest("button, a, input, select, textarea, .video-strip")) return;
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

  const endDrag = () => { isDown = false; };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("lostpointercapture", endDrag);

  stage.addEventListener("scroll", syncProgress);
  window.addEventListener("scroll", syncProgress, { passive: true });
  window.addEventListener("resize", syncProgress);
  syncProgress();
}

videoPrev?.addEventListener("click", () => {
  scrollToVideo(activeVideoIndex() - 1);
});

videoNext?.addEventListener("click", () => {
  scrollToVideo(activeVideoIndex() + 1);
});

function clearTouchPreviews() {
  videoStrip?.querySelectorAll(".is-touch-preview").forEach((card) => {
    card.classList.remove("is-touch-preview");
    card.setAttribute("aria-label", `Preview ${videos[Number(card.dataset.videoIndex)].title}; tap again to open`);
  });
  document.dispatchEvent(new Event("thumbnailpreviewchange"));
}
let thumbnailPointerType = "mouse";
videoStrip?.addEventListener("pointerdown", (event) => {
  thumbnailPointerType = event.pointerType;
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".video-card")) clearTouchPreviews();
});
videoStrip?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();

  const button = event.target.closest("[data-video-index]");
  if (!button) return;
  const index = Number(button.dataset.videoIndex);
  if (event.detail !== 0 && thumbnailPointerType === "touch" && videos[index].previewVideo) {
    if (!button.classList.contains("is-touch-preview")) {
      clearTouchPreviews();
      button.classList.add("is-touch-preview");
      button.setAttribute("aria-label", `Open ${videos[index].title}`);
      document.dispatchEvent(new Event("thumbnailpreviewchange"));
      return;
    }
  }
  clearTouchPreviews();
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
  mediaQuiet = true;
  syncBackgroundMusic();
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

// Measure the actual font so the entire brand heading fits at every width.
function fitWorkHeading() {
  const heading = document.querySelector("#work-title");
  if (!heading || !heading.parentElement) return;
  const available = heading.parentElement.clientWidth;
  if (!available) return;
  heading.style.fontSize = "30px";
  const range = document.createRange();
  range.selectNodeContents(heading);
  const naturalWidth = range.getBoundingClientRect().width;
  if (naturalWidth > available) {
    heading.style.fontSize = `${Math.floor(30 * (available - 1) / naturalWidth * 100) / 100}px`;
  }
}
fitWorkHeading();
window.addEventListener("resize", fitWorkHeading);
if (document.fonts) document.fonts.ready.then(fitWorkHeading);
if ("ResizeObserver" in window) {
  const workHeadingContainer = document.querySelector("#work-title")?.parentElement;
  if (workHeadingContainer) new ResizeObserver(fitWorkHeading).observe(workHeadingContainer);
}