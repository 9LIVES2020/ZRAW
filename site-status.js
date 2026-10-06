(() => {
  const clock = document.querySelector("#siteClock");
  const date = document.querySelector("#siteDate");
  const counter = document.querySelector("#visitorCount");
  if (!clock || !date || !counter) return;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });

  function updateClock() {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date()).map(({ type, value }) => [type, value])
    );
    const timeText = `${parts.hour}:${parts.minute}`;
    const dateText = `${parts.month}/${parts.day}/${parts.year.slice(-2)}`;
    if (clock.textContent !== timeText) {
      clock.textContent = timeText;
      clock.dateTime = `${parts.year}-${parts.month}-${parts.day}T${timeText}:00+08:00`;
      clock.setAttribute("aria-label", `${timeText}, GMT+8`);
    }
    if (date.textContent !== dateText) {
      date.textContent = dateText;
      date.dateTime = `${parts.year}-${parts.month}-${parts.day}`;
    }
  }

  updateClock();
  setInterval(updateClock, 1000);
  document.addEventListener("visibilitychange", updateClock);

  async function updateVisitors() {
    try {
      const response = await fetch("/api/visitors", {
        method: "POST",
        headers: { "X-ZRAW-Visit": "1" },
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Visitor counter unavailable");
      const { count } = await response.json();
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid count");
      // Keep at least five digits; never truncate the total once it grows.
      counter.textContent = String(count).padStart(5, "0");
      counter.setAttribute("aria-label", `${count} unique visitors since October 7, 2026`);
    } catch {
      counter.textContent = "-----";
      counter.setAttribute("aria-label", "Visitor count temporarily unavailable");
      counter.title = "Visitor count temporarily unavailable";
    }
  }

  updateVisitors();
})();
