// /ambulance/tools/hos.js
// CHANGELOG (2026-06-06):
// - Launch map app URL schemes without replacing the Ambulance App page, preventing blank return screens.
// - Open Google Maps and Waze with iOS app schemes instead of blank windows to preserve the Ambulance App page.
// - Equalize the rendered Waze and Google Maps icon box sizes.
// - Replace technical HTTPS location wording with a user-facing location unavailable message.
// - Enlarge and equalize HOS navigation logos and add a visible backing for Google Maps on red.
// - Center the HOS number input inside its card on narrow iPhone layouts.
// - Add Google Maps and Waze button icons and clarify location unavailable messages.
// - Add Android-aligned HOS lookup with helper data, selected site, Maps/Waze directions, distance, nearest sites, and refresh.

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}

function fmtKm(km) {
  return Number.isFinite(km) ? km.toFixed(1) : "N/A";
}

function distanceKm(a, b) {
  const toRad = deg => deg * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function coordinatePair(site) {
  if (!site?.location) return null;
  return {
    lat: site.location.lat.toFixed(6),
    lon: site.location.lon.toFixed(6)
  };
}

function openExternalApp(primaryUrl, fallbackUrl) {
  let cancelled = false;
  const cancelFallback = () => {
    if (document.visibilityState === "hidden") cancelled = true;
  };
  document.addEventListener("visibilitychange", cancelFallback, { once: true });
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = "position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(frame);
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", cancelFallback);
    try { frame.remove(); } catch (_) {}
    if (!cancelled && document.visibilityState === "visible") {
      window.location.href = fallbackUrl;
    }
  }, 900);
  frame.src = primaryUrl;
}

function normalizeClosedText(text) {
  return String(text || "").replace(" Please enter another HOS", "\nPlease enter another HOS");
}

async function dataModule() {
  if (window.__AMBULANCE_SHARED_MODULES?.hosData) return window.__AMBULANCE_SHARED_MODULES.hosData;
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`../hos_data.js?ver=${version}`);
}

export async function run(root) {
  let sites = [];
  let sitesByNumber = new Map();
  let selectedNumber = null;
  let lastLocation = null;
  let loadingLocation = false;
  let locationMessage = "Nearest available HOS\nLocating...";

  root.innerHTML = `
    <style>
      .hos{max-width:760px;margin:0 auto;padding:14px;color:var(--text);--hos-blue:#304CE8;--hos-accent:#1D4ED8}
      .hos-card{border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:0 8px 18px rgba(15,23,42,.10);padding:16px;margin-bottom:14px}
      .hos-title{margin:0;color:var(--text);font-size:18px;font-weight:950}.hos-muted{margin:4px 0 0;color:var(--muted);font-size:13px;font-weight:750;line-height:1.35}
      .hos-input{display:block;box-sizing:border-box;width:100%;height:58px;margin:12px auto 0;border:1px solid color-mix(in oklab,var(--hos-blue) 24%,var(--border));border-radius:14px;background:var(--surface-2);color:var(--text);font-size:22px;font-weight:950;text-align:center;outline:none}
      .hos-input::placeholder{color:#94A3B8}.hos-input:focus{border-color:var(--hos-blue);box-shadow:0 0 0 3px color-mix(in oklab,var(--hos-blue) 16%,transparent)}
      .hos-site{display:none}.hos-site.show{display:block}.hos-pill{display:inline-flex;align-items:center;min-height:28px;padding:4px 12px;border-radius:999px;background:var(--hos-blue);color:#fff;font-size:14px;font-weight:950}
      .hos-name{margin:12px 0 0;color:var(--text);font-size:20px;font-weight:950;line-height:1.25;white-space:pre-line}.hos-details{margin:8px 0 0;color:var(--muted);font-size:13px;font-weight:850;line-height:1.4;white-space:pre-line}
      .hos-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}.hos-nav{min-height:54px;border:0;border-radius:14px;color:#fff;font-size:14px;font-weight:950}.hos-nav[hidden]{display:none}.hos-google{background:#DF2B1E}.hos-waze{background:#03A9F4}.hos-nav span{display:inline-flex;align-items:center;justify-content:center;gap:8px}.hos-nav img{box-sizing:border-box;width:34px;height:34px;object-fit:contain;display:block}.hos-google img{padding:3px;border:1px solid rgba(255,255,255,.95);border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 1px 4px rgba(0,0,0,.18)}
      .hos-distance-head{display:flex;align-items:center;gap:8px}.hos-pin{display:grid;place-items:center;width:24px;height:24px;color:var(--hos-accent)}.hos-distance-title{flex:1;font-size:17px;font-weight:950}.hos-refresh{display:inline-flex;align-items:center;gap:5px;border:1px solid color-mix(in oklab,var(--hos-accent) 30%,var(--border));border-radius:999px;background:color-mix(in oklab,var(--hos-accent) 8%,var(--surface));color:var(--hos-accent);padding:9px 11px;font-size:12px;font-weight:950}
      .hos-spinner{width:20px;height:20px;border:3px solid color-mix(in oklab,var(--hos-accent) 20%,transparent);border-top-color:var(--hos-accent);border-radius:50%;animation:hos-spin .8s linear infinite}.hos-spinner[hidden]{display:none}
      .hos-selected-distance{margin-top:12px;border-radius:13px;background:color-mix(in oklab,var(--hos-accent) 9%,var(--surface));border:1px solid color-mix(in oklab,var(--hos-accent) 20%,var(--border));color:#1E3A8A;padding:12px 14px;font-size:15px;font-weight:950;line-height:1.45;white-space:pre-line}
      .hos-nearest-title{margin-top:10px;border-radius:13px;background:var(--surface-2);border:1px solid var(--border);color:#334155;padding:10px 14px;font-size:14px;font-weight:950;line-height:1.45;white-space:pre-line}
      .hos-rows{display:grid;gap:7px;margin-top:8px}.hos-row{border:1px solid var(--border);border-radius:13px;background:var(--surface);padding:10px 12px}.hos-row-top{display:flex;align-items:center;gap:10px}.hos-row-hos{flex:1;color:var(--text);font-size:15px;font-weight:950}.hos-row-km{border-radius:999px;background:color-mix(in oklab,var(--hos-accent) 10%,var(--surface));border:1px solid color-mix(in oklab,var(--hos-accent) 18%,var(--border));color:var(--hos-accent);padding:4px 9px;font-size:12px;font-weight:950}.hos-row-name{margin-top:3px;color:var(--muted);font-size:13px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      :root[data-theme="dark"] .hos-card,:root[data-theme="dark"] .hos-row{box-shadow:none}:root[data-theme="dark"] .hos-selected-distance{color:#93C5FD}:root[data-theme="dark"] .hos-nearest-title{color:#CBD5E1}
      @media(prefers-color-scheme:dark){:root[data-theme="auto"] .hos-card,:root[data-theme="auto"] .hos-row{box-shadow:none}:root[data-theme="auto"] .hos-selected-distance{color:#93C5FD}:root[data-theme="auto"] .hos-nearest-title{color:#CBD5E1}}
      @media(max-width:380px){.hos{padding:12px 10px}.hos-actions{gap:8px}.hos-nav{font-size:13px}.hos-name{font-size:18px}}
      @keyframes hos-spin{to{transform:rotate(360deg)}}
    </style>
    <section class="hos">
      <section class="hos-card">
        <h2 class="hos-title">Find HOS</h2>
        <p class="hos-muted">Enter the HOS number to view its site details, distance, and directions.</p>
        <input id="hosInput" class="hos-input" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="HOS number" autocomplete="off">
      </section>
      <section id="hosSiteCard" class="hos-card hos-site">
        <span id="hosSiteTitle" class="hos-pill"></span>
        <p id="hosSiteName" class="hos-name"></p>
        <p id="hosSiteDetails" class="hos-details"></p>
      </section>
      <div class="hos-actions">
        <button id="hosGoogle" class="hos-nav hos-google" type="button" hidden><span><img src="images/google_maps.png" alt="">Google Maps</span></button>
        <button id="hosWaze" class="hos-nav hos-waze" type="button" hidden><span><img src="images/waze.png" alt="">Waze</span></button>
      </div>
      <section class="hos-card">
        <div class="hos-distance-head">
          <span class="hos-pin material-symbols-rounded" aria-hidden="true">location_on</span>
          <span class="hos-distance-title">Location Guidance</span>
          <span id="hosSpinner" class="hos-spinner" hidden></span>
          <button id="hosRefresh" class="hos-refresh" type="button"><span class="material-symbols-rounded" style="font-size:18px">refresh</span>Refresh</button>
        </div>
        <div id="hosSelectedDistance" class="hos-selected-distance">Selected HOS\nEnter a HOS number to calculate distance.</div>
        <div id="hosNearestTitle" class="hos-nearest-title">Nearest available HOS\nLocating...</div>
        <div id="hosRows" class="hos-rows" hidden></div>
      </section>
    </section>
  `;

  const input = root.querySelector("#hosInput");
  const siteCard = root.querySelector("#hosSiteCard");
  const siteTitle = root.querySelector("#hosSiteTitle");
  const siteName = root.querySelector("#hosSiteName");
  const siteDetails = root.querySelector("#hosSiteDetails");
  const googleBtn = root.querySelector("#hosGoogle");
  const wazeBtn = root.querySelector("#hosWaze");
  const selectedDistance = root.querySelector("#hosSelectedDistance");
  const nearestTitle = root.querySelector("#hosNearestTitle");
  const rows = root.querySelector("#hosRows");
  const refreshBtn = root.querySelector("#hosRefresh");
  const spinner = root.querySelector("#hosSpinner");

  function selectedSite() {
    return selectedNumber == null ? null : sitesByNumber.get(selectedNumber);
  }

  function setNavVisibility(available) {
    googleBtn.hidden = !available;
    wazeBtn.hidden = !available;
  }

  function renderSelected() {
    const site = selectedSite();
    if (selectedNumber == null) {
      siteCard.classList.remove("show");
      setNavVisibility(false);
      selectedDistance.textContent = "Selected HOS\nEnter a HOS number to calculate distance.";
      return;
    }
    const maxHos = sites.reduce((max, item) => Math.max(max, item.hosNumber), 55);
    siteCard.classList.add("show");
    if (!site) {
      siteTitle.textContent = `HOS ${selectedNumber}`;
      siteName.textContent = "Wrong HOS Number";
      siteDetails.textContent = `SOP has ${maxHos} locations only\nPlease enter another HOS`;
      setNavVisibility(false);
      selectedDistance.textContent = `Selected HOS ${selectedNumber}\nDistance unavailable for this site.`;
      return;
    }
    siteTitle.textContent = site.title;
    siteName.textContent = normalizeClosedText(site.name);
    siteDetails.textContent = site.details;
    setNavVisibility(site.isNavigable);
    renderDistances();
  }

  function setLoading(loading, message) {
    loadingLocation = loading;
    spinner.hidden = !loading;
    if (loading) {
      locationMessage = message || "Nearest available HOS\nAcquiring location...";
      nearestTitle.textContent = locationMessage;
      rows.hidden = true;
    }
  }

  function renderDistances() {
    if (!lastLocation) {
      if (selectedNumber == null) selectedDistance.textContent = "Selected HOS\nEnter a HOS number to calculate distance.";
      setLoading(loadingLocation || true, locationMessage || "Nearest available HOS\nAcquiring location...");
      return;
    }
    setLoading(false);
    const site = selectedSite();
    if (site?.isNavigable) {
      selectedDistance.textContent = `Selected HOS ${site.hosNumber}\n${site.name}\n${fmtKm(distanceKm(lastLocation, site.location))} km away`;
    } else if (selectedNumber != null) {
      selectedDistance.textContent = `Selected HOS ${selectedNumber}\nDistance unavailable for this site.`;
    } else {
      selectedDistance.textContent = "Selected HOS\nEnter a HOS number to calculate distance.";
    }
    const nearest = sites
      .filter(item => item.isNavigable)
      .map(item => ({ site: item, km: distanceKm(lastLocation, item.location) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 4);
    if (!nearest.length) {
      nearestTitle.textContent = "Nearest available HOS\nNo active HOS sites available.";
      rows.hidden = true;
      rows.innerHTML = "";
      return;
    }
    nearestTitle.textContent = "Nearest available HOS";
    rows.hidden = false;
    rows.innerHTML = nearest.map((item, index) => `
      <article class="hos-row">
        <div class="hos-row-top">
          <span class="hos-row-hos">${index === 0 ? "Closest · " : ""}HOS ${esc(item.site.hosNumber)}</span>
          <span class="hos-row-km">${esc(fmtKm(item.km))} km</span>
        </div>
        <div class="hos-row-name">${esc(item.site.name)}</div>
      </article>
    `).join("");
  }

  function updateFromInput() {
    const raw = input.value.replace(/\D/g, "").slice(0, 2);
    if (input.value !== raw) input.value = raw;
    selectedNumber = raw ? Number(raw) : null;
    renderSelected();
    renderDistances();
  }

  function handleLocationError(message = "Location unavailable. Enable GPS and refresh.") {
    setLoading(false);
    if (selectedNumber == null) selectedDistance.textContent = "Selected HOS\nEnter a HOS number to calculate distance.";
    nearestTitle.textContent = `Nearest available HOS\n${message}`;
    rows.hidden = true;
  }

  function getLocation() {
    if (!window.isSecureContext) {
      handleLocationError("Location unavailable. Please open the Ambulance App and allow location access.");
      return;
    }
    if (!navigator.geolocation) {
      handleLocationError("Location is not available on this device.");
      return;
    }
    setLoading(true, "Nearest available HOS\nAcquiring location...");
    navigator.geolocation.getCurrentPosition(
      position => {
        lastLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
        setLoading(false);
        renderDistances();
      },
      error => {
        const denied = error?.code === error?.PERMISSION_DENIED;
        handleLocationError(denied ? "Location permission is needed to calculate nearby sites." : "Location unavailable. Enable GPS and refresh.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  input.addEventListener("input", updateFromInput);
  input.addEventListener("focus", () => input.select());
  root.addEventListener("touchmove", () => {
    if (document.activeElement === input) input.blur();
  }, { passive: true });
  root.addEventListener("wheel", () => {
    if (document.activeElement === input) input.blur();
  }, { passive: true });

  refreshBtn.addEventListener("click", () => {
    setLoading(true, "Nearest available HOS\nRefreshing location...");
    getLocation();
  });

  googleBtn.addEventListener("click", () => {
    const site = selectedSite();
    const coords = coordinatePair(site);
    if (!coords) return;
    const fallback = `https://www.google.com/maps/search/?api=1&query=${coords.lat}%2C${coords.lon}`;
    openExternalApp(`comgooglemaps://?q=${coords.lat},${coords.lon}&center=${coords.lat},${coords.lon}&zoom=17`, fallback);
  });

  wazeBtn.addEventListener("click", () => {
    const site = selectedSite();
    const coords = coordinatePair(site);
    if (!coords) return;
    const fallback = `https://www.waze.com/ul?ll=${coords.lat}%2C${coords.lon}&zoom=17&navigate=yes`;
    openExternalApp(`waze://?ll=${coords.lat},${coords.lon}&zoom=17&navigate=yes`, fallback);
  });

  try {
    const loaded = await (await dataModule()).getHosSites();
    sites = loaded.sites;
    sitesByNumber = new Map(sites.map(site => [site.hosNumber, site]));
    renderSelected();
    renderDistances();
  } catch (error) {
    nearestTitle.textContent = "Nearest available HOS\nUnable to load HOS sites.";
    rows.hidden = true;
  }
  getLocation();
}
