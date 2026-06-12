const CprDefaults = {
  interruptionSeconds: 5,
  cycleSeconds: 120,
  adrenalineSeconds: 240,
  pauseResetThresholdSeconds: 30,
  bpm: 120,
  useWaafles: true,
  playAudioCues: true,
  playCycleNinetySecondCue: true,
  audioCueVoice: "female",
  confirmAdrenalineBeforeLogging: false,
  adrenalineAutoLogDelaySeconds: 5,
  adrenalineConfirmationDelaySeconds: 15,
  resumeAlertSeconds: 10
};

const CprKeys = {
  settings: "cpr_android_parity_settings_v1",
  sessions: "cpr_android_parity_sessions_v1",
  active: "cpr_android_parity_active_v1",
  warningHidden: "cpr_android_parity_warning_hidden_v1",
  introSeen: "cpr_android_parity_intro_seen_v1"
};

const CprIntroCards = [
  { icon: "bell", title: "Keep CPR Open", message: "Keep CPR open while CPR is active. If you leave and come back, review the timers and tap Continue on the CPR Return Alert to restore audio." },
  { icon: "start", title: "CPR Timer", message: "Start CPR to begin total time, the cycle timer, metronome, event tracking, and automatic session saving." },
  { icon: "stop", title: "Stop & Save", message: "Press Stop when CPR is finished. CPR autosaves while active, and Stop saves the final record to CPR History." },
  { icon: "timer", title: "Cycle & Adrenaline Timers", message: "Cycle tracks rhythm-check timing. Adrenaline tracks dose timing, shows due prompts, and records doses based on your Settings." },
  { icon: "pause", title: "Pause", message: "Cycle Pause button pauses the cycle timer. Adrenaline Pause button pauses the adrenaline timer. By default, if a pause lasts more than 30 seconds, the next start begins a fresh timer flow. You can adjust this time in CPR Settings." },
  { icon: "mute", title: "Mute", message: "Mute only stops the metronome sound. Spoken audio cues can be turned on or off in CPR Settings." },
  { icon: "shock", title: "Clinical Events", message: "Log Shock, Amiodarone, DSED, and ROSC during the session. Events appear in the timeline." },
  { icon: "waafles", title: "WAAFELSS", message: "Use WAAFELSS for quick pediatric support calculations during CPR. You can show or hide it from CPR Settings." },
  { icon: "checklist", title: "Recent Events", message: "Recent Events shows the latest visible actions recorded during the current session." },
  { icon: "checklist", title: "History", message: "Use History to review saved sessions, export PDF, CSV, or JSON reports, restore backups, and manage records." },
  { icon: "settings", title: "Settings", message: "Use Settings to adjust timing, BPM, pause behavior, audio cues, WAAFELSS visibility, and the CPR Return Alert." }
];

const CprIntroIcons = {
  start: { viewBox: "0 0 960 960", paths: ["M320,760L320,200L760,480L320,760ZM400,480L400,480L400,480ZM400,614L610,480L400,346L400,614Z"] },
  timer: { viewBox: "0 0 24 24", paths: ["M15,1L9,1v2h6L15,1zM11,14h2L13,8h-2v6zM19.03,7.39l1.42,-1.42c-0.43,-0.51 -0.9,-0.99 -1.41,-1.41l-1.42,1.42C16.07,4.74 14.12,4 12,4c-4.97,0 -9,4.03 -9,9s4.02,9 9,9 9,-4.03 9,-9c0,-2.12 -0.74,-4.07 -1.97,-5.61zM12,20c-3.87,0 -7,-3.13 -7,-7s3.13,-7 7,-7 7,3.13 7,7 -3.13,7 -7,7z"] },
  pause: { viewBox: "0 0 960 960", paths: ["M520,760L520,200L760,200L760,760L520,760ZM200,760L200,200L440,200L440,760L200,760ZM600,680L680,680L680,280L600,280L600,680ZM280,680L360,680L360,280L280,280L280,680Z"] },
  bell: { viewBox: "0 0 24 24", paths: ["M12,22c1.24,0 2.25,-0.75 2.68,-1.82H9.32C9.75,21.25 10.76,22 12,22z", "M19,17h-1V10.6c0,-3.07 -2.02,-5.64 -4.8,-6.33V3.5c0,-0.66 -0.54,-1.2 -1.2,-1.2s-1.2,0.54 -1.2,1.2v0.77C8.02,4.96 6,7.53 6,10.6V17H5c-0.55,0 -1,0.45 -1,1s0.45,1 1,1h14c0.55,0 1,-0.45 1,-1s-0.45,-1 -1,-1zM16,17H8V10.6C8,8.1 9.79,6 12,6s4,2.1 4,4.6V17z"] },
  mute: { viewBox: "0 0 960 960", paths: ["M792,904L671,783Q646,799 618,810.5Q590,822 560,829L560,747Q574,742 587.5,737Q601,732 613,725L480,592L480,800L280,600L120,600L120,360L248,360L56,168L112,112L848,848L792,904ZM784,672L726,614Q743,583 751.5,549Q760,515 760,479Q760,385 705,311Q650,237 560,211L560,129Q684,157 762,254.5Q840,352 840,479Q840,532 825.5,581Q811,630 784,672ZM650,538L560,448L560,318Q607,340 633.5,384Q660,428 660,480Q660,495 657.5,509.5Q655,524 650,538ZM480,368L376,264L480,160L480,368ZM400,606L400,512L328,440L200,440L200,520L314,520L400,606Z"] },
  shock: { viewBox: "0 0 960 960", paths: ["M280,880L440,580L120,540L600,80L680,80L520,380L840,420L360,880L280,880ZM502,633L663,479L394,445L457,328L297,482L565,515L502,633Z"] },
  waafles: { viewBox: "0 0 960 960", paths: ["M324.5,555.5Q310,541 310,520Q310,499 324.5,484.5Q339,470 360,470Q381,470 395.5,484.5Q410,499 410,520Q410,541 395.5,555.5Q381,570 360,570Q339,570 324.5,555.5ZM564.5,555.5Q550,541 550,520Q550,499 564.5,484.5Q579,470 600,470Q621,470 635.5,484.5Q650,499 650,520Q650,541 635.5,555.5Q621,570 600,570Q579,570 564.5,555.5ZM480,800Q614,800 707,707Q800,614 800,480Q800,456 797,433.5Q794,411 786,390Q765,395 744,397.5Q723,400 700,400Q609,400 528,361Q447,322 390,252Q358,330 298.5,387.5Q239,445 160,474Q160,476 160,477Q160,478 160,480Q160,614 253,707Q346,800 480,800ZM480,880Q397,880 324,848.5Q251,817 197,763Q143,709 111.5,636Q80,563 80,480Q80,397 111.5,324Q143,251 197,197Q251,143 324,111.5Q397,80 480,80Q563,80 636,111.5Q709,143 763,197Q817,251 848.5,324Q880,397 880,480Q880,563 848.5,636Q817,709 763,763Q709,817 636,848.5Q563,880 480,880ZM426,165Q468,235 540,277.5Q612,320 700,320Q714,320 727,318.5Q740,317 754,315Q712,245 640,202.5Q568,160 480,160Q466,160 453,161.5Q440,163 426,165ZM177,379Q228,350 266,304Q304,258 323,201Q272,230 234,276Q196,322 177,379Z"] },
  checklist: { viewBox: "0 0 24 24", paths: ["M22,7h-9v2h9V7zM22,15h-9v2h9V15zM5.54,11L2,7.46l1.41,-1.41l2.12,2.12l4.24,-4.24l1.41,1.41L5.54,11zM5.54,19L2,15.46l1.41,-1.41l2.12,2.12l4.24,-4.24l1.41,1.41L5.54,19z"] },
  stop: { viewBox: "0 0 960 960", paths: ["M240,720L240,240L720,240L720,720L240,720ZM320,640L640,640L640,320L320,320L320,640Z"] },
  settings: { viewBox: "0 0 960 960", paths: ["M370,880L354,752Q341,747 329.5,740Q318,733 307,725L188,775L78,585L181,507Q180,500 180,493.5Q180,487 180,480Q180,473 180,466.5Q180,460 181,453L78,375L188,185L307,235Q318,227 330,220Q342,213 354,208L370,80L590,80L606,208Q619,213 630.5,220Q642,227 653,235L772,185L882,375L779,453Q780,460 780,466.5Q780,473 780,480Q780,487 780,493.5Q780,500 778,507L881,585L771,775L653,725Q642,733 630,740Q618,747 606,752L590,880L370,880ZM440,800L519,800L533,694Q564,686 590.5,670.5Q617,655 639,633L738,674L777,606L691,541Q696,527 698,511.5Q700,496 700,480Q700,464 698,448.5Q696,433 691,419L777,354L738,286L639,328Q617,305 590.5,289.5Q564,274 533,266L520,160L441,160L427,266Q396,274 369.5,289.5Q343,305 321,327L222,286L183,354L269,418Q264,433 262,448Q260,463 260,480Q260,496 262,511Q264,526 269,541L183,606L222,674L321,632Q343,655 369.5,670.5Q396,686 427,694L440,800ZM482,620Q540,620 581,579Q622,538 622,480Q622,422 581,381Q540,340 482,340Q423,340 382.5,381Q342,422 342,480Q342,538 382.5,579Q423,620 482,620Z"] }
};

function cprIntroIconSvg(name) {
  const icon = CprIntroIcons[name];
  if (!icon) return "";
  return `<svg viewBox="${icon.viewBox}" aria-hidden="true">${icon.paths.map((path) => `<path d="${path}"></path>`).join("")}</svg>`;
}

function cprIsIntroSeen() {
  return localStorage.getItem(CprKeys.introSeen) === "1";
}

function cprMarkIntroSeen() {
  localStorage.setItem(CprKeys.introSeen, "1");
}

function cprLoadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(CprKeys.settings) || "{}");
    return Object.fromEntries(Object.keys(CprDefaults).map((key) => [
      key,
      saved[key] ?? CprDefaults[key]
    ]));
  } catch {
    return { ...CprDefaults };
  }
}

function cprSaveSettings(settings) {
  const normalized = Object.fromEntries(Object.keys(CprDefaults).map((key) => [
    key,
    settings[key] ?? CprDefaults[key]
  ]));
  localStorage.setItem(CprKeys.settings, JSON.stringify(normalized));
}

async function cprTryPortraitLock() {
  try {
    if (screen.orientation?.lock) await screen.orientation.lock("portrait");
  } catch {
    // iOS Safari and Web Clips currently do not expose a reliable orientation lock.
  }
}

function cprLoadSessions() {
  try {
    return JSON.parse(localStorage.getItem(CprKeys.sessions) || "[]");
  } catch {
    return [];
  }
}

function cprSaveSessions(sessions) {
  localStorage.setItem(CprKeys.sessions, JSON.stringify(sessions));
}

function cprLoadActive() {
  try {
    const active = JSON.parse(localStorage.getItem(CprKeys.active) || "null");
    if (!active || active.endedAtMillis) return null;
    const snapshot = active.activeTimerSnapshot;
    const stopped = (active.events || []).some((event) => event.type === "CPR_STOPPED");
    // Android shows the active-session card only while the CPR service is
    // running, or while the same session is awaiting Stop after ROSC.
    const activeLike = !!snapshot?.sessionId && (
      snapshot.isRunning ||
      snapshot.isAwaitingSave
    );
    if (!activeLike || stopped) {
      localStorage.removeItem(CprKeys.active);
      return null;
    }
    return active;
  } catch {
    return null;
  }
}

function cprSaveActive(active) {
  if (!active) {
    localStorage.removeItem(CprKeys.active);
    return;
  }
  localStorage.setItem(CprKeys.active, JSON.stringify(active));
}

function cprUpsertSession(session) {
  const sessions = cprLoadSessions();
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) sessions[index] = session;
  else sessions.unshift(session);
  cprSaveSessions(sessions);
}

function cprFormatSeconds(seconds) {
  seconds = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function cprShortDateTime(millis) {
  return new Date(millis).toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function cprSettingsDate(millis) {
  const date = new Date(millis);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${String(date.getDate()).padStart(2, "0")}.${month}.${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function cprClock(millis) {
  return new Date(millis).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function cprClockSeconds(millis) {
  return new Date(millis).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function cprCounts(session) {
  const events = session?.events || [];
  return {
    cycle: events.filter((event) => event.type === "CYCLE_COMPLETED").length || session?.cycleCount || 0,
    adr: events.filter((event) => event.type === "ADRENALINE_ADMINISTERED").length || session?.adrenalineCount || 0,
    shock: events.filter((event) => event.type === "SHOCK_DELIVERED").length || session?.shockCount || 0,
    amio: events.filter((event) => event.type === "AMIODARONE_ADMINISTERED").length || session?.amiodaroneCount || 0,
    dsed: events.filter((event) => event.type === "DSED_DELIVERED").length || session?.dsedCount || 0,
    rosc: events.filter((event) => event.type === "ROSC").length || session?.roscCount || 0
  };
}

function cprHumanEvents(session) {
  return (session?.events || []).filter((event) => !["INTERRUPTION_STARTED", "INTERRUPTION_ENDED"].includes(event.type));
}

function cprLatestHumanEvent(session) {
  return [...cprHumanEvents(session)].reverse()[0] || null;
}

function cprDisplayLabel(event) {
  return String(event?.label || "CPR event").replace(/\bno\.\s*(\d+)/gi, "#$1");
}

function cprRecordDateTime(millis) {
  const date = new Date(millis);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${month} ${String(date.getDate()).padStart(2, "0")}, ${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function cprTimelineDateLabel(events, fallbackMillis) {
  const visible = (events || []).filter((event) => !["INTERRUPTION_STARTED", "INTERRUPTION_ENDED"].includes(event.type));
  const startMillis = visible[0]?.wallTimeMillis || fallbackMillis;
  const endMillis = visible[visible.length - 1]?.wallTimeMillis || startMillis;
  const fmt = (millis) => new Date(millis).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  const start = fmt(startMillis);
  const end = fmt(endMillis);
  return start === end ? start : `${start} - ${end}`;
}

function cprSummary(sessions) {
  return (sessions || []).reduce((summary, session) => {
    summary.count += 1;
    summary.totalSeconds += Number(session.totalSeconds) || 0;
    summary.cycles += Number(session.cycleCount) || 0;
    summary.adrenaline += Number(session.adrenalineCount) || 0;
    summary.amiodarone += Number(session.amiodaroneCount) || 0;
    summary.shocks += Number(session.shockCount) || 0;
    summary.dsed += Number(session.dsedCount) || 0;
    summary.rosc += Number(session.roscCount) || 0;
    return summary;
  }, { count: 0, totalSeconds: 0, cycles: 0, adrenaline: 0, amiodarone: 0, shocks: 0, dsed: 0, rosc: 0 });
}

function cprFilterSessions(sessions, filter) {
  const activeId = cprLoadActive()?.id;
  return [...(sessions || [])].filter((session) => {
    if (filter === "Active") return session.id === activeId || !session.endedAtMillis;
    if (filter === "ROSC") return (cprCounts(session).rosc || 0) > 0;
    if (filter === "Completed") return !!session.endedAtMillis;
    return true;
  }).sort((a, b) => (b.startedAtMillis || 0) - (a.startedAtMillis || 0));
}

function cprCsvEscape(value) {
  const escaped = String(value ?? "").replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function cprBuildHistoryCsv(sessions, filterLabel) {
  const list = sessions || [];
  const summary = cprSummary(list);
  const lines = [];
  lines.push("Ambulance CPR Report");
  lines.push(`Filter,${cprCsvEscape(filterLabel)}`);
  lines.push(`Records,${summary.count}`);
  lines.push(`Total CPR,${cprFormatSeconds(summary.totalSeconds)}`);
  lines.push(`Cycles,${summary.cycles}`);
  lines.push(`Adrenaline,${summary.adrenaline}`);
  lines.push(`Shocks,${summary.shocks}`);
  lines.push(`DSED,${summary.dsed}`);
  lines.push(`ROSC,${summary.rosc}`);
  lines.push("");
  lines.push("Session Summary");
  lines.push("Session ID,Started,Ended,Duration,Cycles,Adrenaline,Amiodarone,Shocks,DSED,ROSC,Outcome");
  list.forEach((session) => {
    lines.push([
      session.id,
      cprSettingsDate(session.startedAtMillis),
      session.endedAtMillis ? cprSettingsDate(session.endedAtMillis) : "",
      cprFormatSeconds(session.totalSeconds),
      session.cycleCount || 0,
      session.adrenalineCount || 0,
      session.amiodaroneCount || 0,
      session.shockCount || 0,
      session.dsedCount || 0,
      session.roscCount || 0,
      session.outcome || ""
    ].map(cprCsvEscape).join(","));
  });
  lines.push("");
  lines.push("Event Timeline");
  lines.push("Session ID,Session Started,Event Time,Elapsed,Type,Label,Note");
  list.forEach((session) => {
    cprHumanEvents(session).forEach((event) => {
      lines.push([
        session.id,
        cprSettingsDate(session.startedAtMillis),
        cprSettingsDate(event.wallTimeMillis),
        cprFormatSeconds(event.elapsedSeconds),
        event.type,
        cprDisplayLabel(event),
        event.note || ""
      ].map(cprCsvEscape).join(","));
    });
  });
  return lines.join("\n");
}

function cprBuildRecordCsv(session) {
  const lines = [];
  lines.push("Ambulance CPR Record");
  lines.push("Started,Ended,Duration,Cycles,Adrenaline,Amiodarone,Shocks,DSED,ROSC,Outcome");
  lines.push([
    cprRecordDateTime(session.startedAtMillis),
    session.endedAtMillis ? cprRecordDateTime(session.endedAtMillis) : "",
    cprFormatSeconds(session.totalSeconds),
    session.cycleCount || 0,
    session.adrenalineCount || 0,
    session.amiodaroneCount || 0,
    session.shockCount || 0,
    session.dsedCount || 0,
    session.roscCount || 0,
    session.outcome || ""
  ].map(cprCsvEscape).join(","));
  lines.push("");
  lines.push("Elapsed,Time,Event,Type,Note");
  cprHumanEvents(session).forEach((event) => {
    lines.push([
      cprFormatSeconds(event.elapsedSeconds),
      cprRecordDateTime(event.wallTimeMillis),
      cprDisplayLabel(event),
      event.type,
      event.note || ""
    ].map(cprCsvEscape).join(","));
  });
  return lines.join("\n");
}

function cprExportStamp() {
  const date = new Date();
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
}

async function cprDownloadBlob(blob, name) {
  if (navigator.share && window.File) {
    const files = [new File([blob], name, { type: blob.type || "application/octet-stream" })];
    if (!navigator.canShare || navigator.canShare({ files })) {
      try {
        await navigator.share({ files });
        return true;
      } catch (error) {
        if (error?.name === "AbortError") return false;
      }
    }
    if (blob.type !== "application/pdf") {
      const textFiles = [new File([blob], name, { type: "text/plain" })];
      if (!navigator.canShare || navigator.canShare({ files: textFiles })) {
        try {
          await navigator.share({ files: textFiles });
          return true;
        } catch (error) {
          if (error?.name === "AbortError") return false;
        }
      }
    }
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return true;
}

function cprDownloadText(text, name, type) {
  return cprDownloadBlob(new Blob([text], { type }), name);
}

function cprJsonTooLarge(json) {
  return new TextEncoder().encode(json).length > 5 * 1024 * 1024;
}

function cprWithoutNulls(value) {
  if (Array.isArray(value)) return value.map(cprWithoutNulls);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined)
    .map(([key, item]) => [key, cprWithoutNulls(item)]));
}

function cprAndroidJson(value) {
  return JSON.stringify(cprWithoutNulls(value), null, 2);
}

function cprSanitizeImportedSessions(value) {
  if (!Array.isArray(value)) throw new Error("Backup must be a CPR record array.");
  return value
    .filter((session) => session && String(session.id || "").trim() && Number(session.startedAtMillis) > 0)
    .map((session) => ({
      ...session,
      events: (session.events || []).map((event, index) => ({
        ...event,
        id: event.id || `evt_import_${session.id}_${index}_${Date.now()}`
      }))
    }))
    .sort((a, b) => (b.startedAtMillis || 0) - (a.startedAtMillis || 0));
}

function cprMergeSessions(current, restored) {
  const map = new Map();
  [...(current || []), ...(restored || [])].forEach((session) => map.set(session.id, session));
  return [...map.values()].sort((a, b) => (b.startedAtMillis || 0) - (a.startedAtMillis || 0));
}

function cprReadableReport(session) {
  const counts = cprCounts(session);
  const lines = [];
  lines.push(`Started: ${cprSettingsDate(session.startedAtMillis)}`);
  if (session.endedAtMillis) lines.push(`Ended: ${cprSettingsDate(session.endedAtMillis)}`);
  lines.push(`Duration: ${cprFormatSeconds(session.totalSeconds)}`);
  lines.push(`Cycles: ${counts.cycle}`);
  lines.push(`Adrenaline: ${counts.adr}`);
  lines.push(`Amiodarone: ${counts.amio}`);
  lines.push(`Shocks: ${counts.shock}`);
  lines.push(`DSED: ${counts.dsed}`);
  lines.push(`ROSC: ${counts.rosc}`);
  if (session.outcome) lines.push(`Outcome: ${session.outcome}`);
  lines.push("");
  cprHumanEvents(session).forEach((event) => {
    lines.push(`${cprFormatSeconds(event.elapsedSeconds)} | ${cprDisplayLabel(event)}`);
    if (String(event.note || "").trim()) lines.push(`  Note: ${event.note.trim()}`);
  });
  return lines.join("\n");
}

function cprWrapPdfText(text, maxChars) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function cprPdfEscape(text) {
  return String(text ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function cprBuildPdfBlob(sessions) {
  const objects = [];
  const pages = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };
  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  let ops = [];
  let y = 42;

  const rgb = {
    text: "0.067 0.094 0.153",
    body: "0.122 0.161 0.216",
    muted: "0.278 0.329 0.404",
    red: "0.863 0.149 0.149",
    border: "0.902 0.824 0.824",
    separator: "0.953 0.820 0.820",
    white: "1 1 1"
  };

  function text(text, x, baseline, size, color = rgb.body, bold = false) {
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg ${x} ${baseline} Td (${cprPdfEscape(text)}) Tj ET`);
  }

  function rect(x, top, width, height, color, mode = "f") {
    const bottom = 842 - top - height;
    ops.push(`${color} ${mode === "S" ? "RG" : "rg"} ${x} ${bottom} ${width} ${height} re ${mode}`);
  }

  function line(x1, y1, x2, y2, color = rgb.separator, width = 2) {
    ops.push(`${color} RG ${width} w ${x1} ${842 - y1} m ${x2} ${842 - y2} l S`);
  }

  function finishPage() {
    text("Ambulance App", 28, 20, 9, "0.841 0.848 0.863", true);
    const stream = ops.join("\n");
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pages.push(pageId);
  }

  function newPage() {
    if (ops.length) finishPage();
    ops = [];
    y = 42;
  }

  function ensure(rowHeight, withEventHeader = false) {
    if (y + rowHeight <= 800) return;
    newPage();
    if (withEventHeader) drawEventTableHeader();
  }

  function drawLine(textValue, size = 9.5, color = rgb.body, bold = false, x = 36, gap = 17) {
    ensure(gap);
    text(textValue, x, 842 - y, size, color, bold);
    y += gap;
  }

  function pdfSummaryDate(millis) {
    const date = new Date(millis);
    return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleDateString("en-US", { month: "short" })}`;
  }

  function sameSummaryDate(firstMillis, secondMillis) {
    const first = new Date(firstMillis);
    const second = new Date(secondMillis);
    return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
  }

  function centerText(value, x, baseline, size = 10.5, color = rgb.body, bold = true) {
    const approxWidth = String(value).length * size * 0.27;
    text(value, x - approxWidth, baseline, size, color, bold);
  }

  function drawSummaryDateTime(millis, x, headerBottom, showDate) {
    if (showDate) {
      centerText(pdfSummaryDate(millis), x, 842 - (headerBottom + 16), 10.5);
      centerText(cprClock(millis), x, 842 - (headerBottom + 32), 10.5);
    } else {
      centerText(cprClock(millis), x, 842 - (headerBottom + 25), 10.5);
    }
  }

  function drawSummaryTable(session) {
    ensure(60);
    const top = y;
    const headerBottom = y + 24;
    const rowBottom = y + 60;
    rect(28, top, 539, 24, rgb.red, "f");
    rect(28, headerBottom, 539, 36, rgb.border, "S");
    const headers = ["Started", "Ended", "Duration", "Cycles", "Adrenaline", "Amiodarone", "Shock", "DSED", "ROSC"];
    const xs = [55, 112, 170, 228, 288, 360, 435, 487, 535];
    headers.forEach((header, index) => centerText(header, xs[index], 842 - (top + 16), 11, rgb.white, true));
    const spansDates = session.endedAtMillis ? !sameSummaryDate(session.startedAtMillis, session.endedAtMillis) : false;
    drawSummaryDateTime(session.startedAtMillis, xs[0], headerBottom, spansDates);
    if (session.endedAtMillis) drawSummaryDateTime(session.endedAtMillis, xs[1], headerBottom, spansDates);
    else centerText("Active", xs[1], 842 - (headerBottom + 19), 10.5);
    [
      cprFormatSeconds(session.totalSeconds),
      session.cycleCount || 0,
      session.adrenalineCount || 0,
      session.amiodaroneCount || 0,
      session.shockCount || 0,
      session.dsedCount || 0,
      session.roscCount || 0
    ].forEach((value, index) => centerText(String(value), xs[index + 2], 842 - (headerBottom + 25), 10.5));
    y = rowBottom;
  }

  function drawEventTableHeader() {
    ensure(24);
    const top = y;
    rect(28, top, 539, 24, rgb.red, "f");
    text("Elapsed", 34, 842 - (top + 16), 11.5, rgb.white, true);
    text("Time", 92, 842 - (top + 16), 11.5, rgb.white, true);
    text("Event", 164, 842 - (top + 16), 11.5, rgb.white, true);
    y += 24;
  }

  function drawEventTableRow(event) {
    const note = String(event.note || "").trim();
    const eventLines = [
      ...cprWrapPdfText(cprDisplayLabel(event), 66),
      ...(note ? cprWrapPdfText(`Note: ${note}`, 66) : [])
    ];
    const rowHeight = Math.max(26, 12 + (eventLines.length * 11));
    ensure(rowHeight, true);
    const rowTop = y;
    rect(28, rowTop, 539, rowHeight, rgb.border, "S");
    text(cprFormatSeconds(event.elapsedSeconds), 34, 842 - (rowTop + 15), 10, rgb.body, true);
    text(cprClock(event.wallTimeMillis), 92, 842 - (rowTop + 15), 10, rgb.body, true);
    eventLines.forEach((lineText, index) => {
      text(lineText, 164, 842 - (rowTop + 15 + (index * 11)), 10, rgb.body, true);
    });
    y += rowHeight;
  }

  const list = sessions || [];
  if (!list.length) {
    drawLine("Ambulance CPR Report", 24, rgb.text, true, 36, 24);
    drawLine("No CPR records.", 9.5, rgb.muted, false, 36, 14);
  }
  list.forEach((session, index) => {
    if (index > 0) newPage();
    drawLine("Ambulance CPR Report", 24, rgb.text, true, 36, 24);
    drawLine(`CPR on ${cprRecordDateTime(session.startedAtMillis)}`, 16, rgb.red, true, 36, 24);
    drawSummaryTable(session);
    y += 18;
    line(28, y, 567, y, rgb.separator, 2);
    y += 22;
    drawLine("Events", 16, rgb.red, true, 36, 16);
    const events = cprHumanEvents(session);
    if (!events.length) {
      drawLine("No events recorded.", 9.5, rgb.muted, false, 36, 14);
    } else {
      drawEventTableHeader();
      events.forEach(drawEventTableRow);
    }
  });
  finishPage();
  const pagesId = objects.length + 1;
  const catalogId = objects.length + 2;
  objects.forEach((body, index) => {
    if (body.includes("/Parent 0 0 R")) objects[index] = body.replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
  });
  objects.push(`<< /Type /Pages /Kids [${pages.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  objects.push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function cprFinalizeActive(outcome = "Completed") {
  const active = cprLoadActive();
  if (!active) return null;
  const now = Date.now();
  const totalSeconds = active.activeTimerSnapshot?.cprElapsedSeconds ?? active.totalSeconds ?? 0;
  const stoppedEvent = {
    id: `evt_${now}`,
    elapsedSeconds: totalSeconds,
    wallTimeMillis: now,
    type: "CPR_STOPPED",
    label: "CPR Timer Stopped",
    note: ""
  };
  const finalized = {
    ...active,
    endedAtMillis: now,
    updatedAtMillis: now,
    outcome: active.outcome || outcome,
    totalSeconds,
    cycleCount: active.activeTimerSnapshot?.cycleCount ?? active.cycleCount ?? 0,
    adrenalineCount: active.activeTimerSnapshot?.adrenalineCount ?? active.adrenalineCount ?? 0,
    amiodaroneCount: active.activeTimerSnapshot?.amiodaroneCount ?? active.amiodaroneCount ?? 0,
    shockCount: active.activeTimerSnapshot?.shockCount ?? active.shockCount ?? 0,
    dsedCount: active.activeTimerSnapshot?.dsedCount ?? active.dsedCount ?? 0,
    roscCount: active.activeTimerSnapshot?.roscCount ?? active.roscCount ?? 0,
    activeTimerSnapshot: null,
    events: [...(active.events || []), stoppedEvent]
  };
  cprUpsertSession(finalized);
  cprSaveActive(null);
  return finalized;
}
