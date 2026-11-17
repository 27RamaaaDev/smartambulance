const $ = (selector) => document.querySelector(selector);

const app = $("#app");
const progress = $("#progress");
const progressFill = $("#progressFill");
const progressLabel = $("#progressLabel");
const callPill = $("#callPill");
const pillTimer = $("#pillTimer");
const toast = $("#toast");

const permLocation = $("#permLocation");
const permCamera = $("#permCamera");
const permNote = $("#permNote");
const permAllowBtn = $("#permAllowBtn");

const screenCall = $("#screen-call");
const callStatus = $("#callStatus");
const callTimer = $("#callTimer");
const callWave = $("#callWave");
const selfVideo = $("#selfVideo");
const selfOff = $("#selfOff");
const callLoc = $("#callLoc");
const chat = $("#chat");
const replies = $("#replies");
const micBtn = $("#micBtn");
const camBtn = $("#camBtn");
const endCallBtn = $("#endCallBtn");
const backFromCallBtn = $("#backFromCallBtn");

const radar = $("#radar");
const searchTitle = $("#searchTitle");
const searchLead = $("#searchLead");
const unitList = $("#unitList");
const foundCard = $("#foundCard");
const trackBtn = $("#trackBtn");

const routeDone = $("#routeDone");
const ambMarker = $("#ambMarker");
const trackTitle = $("#trackTitle");
const trackSub = $("#trackSub");
const etaBox = $("#etaBox");
const etaMin = $("#etaMin");
const etaUnit = $("#etaUnit");
const trackFill = $("#trackFill");
const trackDist = $("#trackDist");
const trackStage = $("#trackStage");
const trackTip = $("#trackTip");
const pickedUpBtn = $("#pickedUpBtn");

const patientForm = $("#patientForm");
const ratingForm = $("#ratingForm");
const starLabel = $("#starLabel");
const ratingError = $("#ratingError");

const confirmDialog = $("#confirmDialog");

const SCREENS = ["home", "permission", "call", "search", "track", "form", "rating", "done"];
const TOTAL_STEPS = 6;
const STEP_INFO = {
  permission: [1, "Izin akses"],
  call: [2, "Video call operator"],
  search: [3, "Mencari ambulans"],
  track: [4, "Pelacakan ambulans"],
  form: [5, "Data pasien"],
  rating: [6, "Penilaian layanan"]
};

const UNITS = [
  { id: "AMB-07", base: "Puskesmas Melati", dist: 3.4, eta: 12, free: false, blip: ".b1" },
  { id: "AMB-02", base: "RS Medika Utama", dist: 2.1, eta: 8, free: true, blip: ".b2" },
  { id: "AMB-04", base: "RSUD Kota Harapan", dist: 1.2, eta: 5, free: true, blip: ".b3", plate: "B 1190 KX", crew: "Andi (pengemudi) · Ns. Dewi (perawat)" }
];

const CONDITIONS = ["Sesak napas", "Pingsan / tidak sadar", "Nyeri dada", "Kecelakaan / luka", "Lainnya"];
const CONSCIOUS = ["Sadar & bernapas", "Tidak sadar", "Tidak yakin"];

const TIPS = {
  "Sesak napas": "Dudukkan pasien tegak, longgarkan pakaian, dan buka jendela agar udara segar masuk.",
  "Pingsan / tidak sadar": "Jika pasien bernapas, miringkan tubuhnya perlahan. Jangan beri makan atau minum.",
  "Nyeri dada": "Minta pasien duduk tenang dan hentikan semua aktivitas. Siapkan obat rutinnya.",
  "Kecelakaan / luka": "Tekan luka dengan kain bersih. Jangan pindahkan korban jika ada cedera leher.",
  "Lainnya": "Temani pasien, tetap tenang, dan siapkan kartu identitas serta obat yang dikonsumsi."
};

const STAR_TEXT = ["Ketuk bintang untuk menilai", "Sangat buruk", "Kurang baik", "Cukup", "Baik", "Sangat baik"];

const TRIP_MS = 24000;

const state = {
  stream: null,
  coords: null,
  permDone: false,
  callActive: false,
  dispatched: false,
  callSeconds: 0,
  callTimerId: null,
  returnScreen: "track",
  condition: "",
  conscious: "",
  unit: null,
  trackTimerId: null,
  trackStart: 0,
  arrived: false,
  patient: null,
  rating: 0,
  timeouts: [],
  toastId: null
};

function later(fn, ms) {
  const id = setTimeout(fn, ms);
  state.timeouts.push(id);
  return id;
}

function clearAllLater() {
  state.timeouts.forEach(clearTimeout);
  state.timeouts = [];
}

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function formatKm(value) {
  if (value < 1) {
    return Math.max(10, Math.round((value * 1000) / 10) * 10) + " m";
  }
  return value.toFixed(1).replace(".", ",") + " km";
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  if (state.toastId) clearTimeout(state.toastId);
  state.toastId = setTimeout(() => {
    toast.hidden = true;
  }, 3800);
}

function show(name) {
  SCREENS.forEach((item) => {
    $("#screen-" + item).hidden = item !== name;
  });
  app.dataset.screen = name;

  const info = STEP_INFO[name];
  progress.hidden = !info || name === "call";
  if (info) {
    progressFill.style.width = (info[0] / TOTAL_STEPS) * 100 + "%";
    progressLabel.textContent = "Langkah " + info[0] + " dari " + TOTAL_STEPS + " · " + info[1];
  }

  callPill.hidden = !(state.callActive && state.dispatched && (name === "search" || name === "track"));

  window.scrollTo(0, 0);
  const heading = $("#screen-" + name + " h1");
  if (heading) heading.focus({ preventScroll: true });
}

function askConfirm(title, text, yesLabel, onYes) {
  if (typeof confirmDialog.showModal !== "function") {
    if (window.confirm(title + "\n" + text)) onYes();
    return;
  }
  $("#confirmTitle").textContent = title;
  $("#confirmText").textContent = text;
  $("#confirmYes").textContent = yesLabel;
  confirmDialog.onclose = null;
  $("#confirmYes").onclick = () => {
    confirmDialog.close();
    onYes();
  };
  $("#confirmNo").onclick = () => confirmDialog.close();
  confirmDialog.showModal();
}

function applyTextSize(large) {
  document.documentElement.classList.toggle("large-text", large);
  const btn = $("#textSizeBtn");
  btn.setAttribute("aria-pressed", String(large));
  btn.setAttribute("aria-label", large ? "Kembalikan ukuran tulisan normal" : "Perbesar ukuran tulisan");
}

try {
  applyTextSize(localStorage.getItem("sa-large-text") === "true");
} catch (e) {
  applyTextSize(false);
}

$("#textSizeBtn").addEventListener("click", () => {
  const next = !document.documentElement.classList.contains("large-text");
  applyTextSize(next);
  try {
    localStorage.setItem("sa-large-text", String(next));
  } catch (e) {}
  showToast(next ? "Tulisan diperbesar" : "Ukuran tulisan normal");
});

function setPerm(el, value, text) {
  el.dataset.state = value;
  el.querySelector(".perm-status").textContent = text;
}

function requestLocation() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: Math.round(pos.coords.accuracy)
        };
        resolve(true);
      },
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

function requestCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return Promise.resolve(false);
  }
  return navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "user" }, audio: true })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }))
    .then((stream) => {
      state.stream = stream;
      return true;
    })
    .catch(() => false);
}

function resetPermissionScreen() {
  state.permDone = false;
  setPerm(permLocation, "idle", "Menunggu");
  setPerm(permCamera, "idle", "Menunggu");
  permNote.hidden = true;
  permAllowBtn.disabled = false;
  permAllowBtn.textContent = "Izinkan & Lanjutkan";
}

$("#sosBtn").addEventListener("click", () => {
  resetPermissionScreen();
  show("permission");
});

permAllowBtn.addEventListener("click", async () => {
  if (state.permDone) {
    startCall();
    return;
  }

  permAllowBtn.disabled = true;
  permAllowBtn.textContent = "Meminta izin…";

  setPerm(permLocation, "loading", "Meminta…");
  const locOk = await requestLocation();
  setPerm(permLocation, locOk ? "ok" : "denied", locOk ? "Diizinkan" : "Ditolak");

  setPerm(permCamera, "loading", "Meminta…");
  const camOk = await requestCamera();
  setPerm(permCamera, camOk ? "ok" : "denied", camOk ? "Diizinkan" : "Ditolak");

  state.permDone = true;
  permAllowBtn.disabled = false;

  if (locOk && camOk) {
    permAllowBtn.textContent = "Menghubungkan…";
    later(startCall, 700);
    return;
  }

  const notes = [];
  if (!locOk) notes.push("Lokasi tidak didapat, operator akan menanyakan alamat Anda.");
  if (!camOk) notes.push("Kamera tidak aktif, panggilan tetap berjalan.");
  if (!window.isSecureContext) notes.push("Untuk kamera, buka aplikasi melalui https atau localhost.");
  permNote.textContent = notes.join(" ");
  permNote.hidden = false;
  permAllowBtn.textContent = "Lanjutkan Panggilan";
});

function addBubble(text, who) {
  const el = document.createElement("div");
  el.className = "bubble bubble-" + who;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function operatorSay(text, then) {
  callWave.classList.add("is-speaking");
  later(() => {
    addBubble(text, "op");
    later(() => {
      callWave.classList.remove("is-speaking");
      if (then) then();
    }, 900);
  }, 700);
}

function setReplies(options, handler) {
  replies.innerHTML = "";
  options.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reply-btn";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      replies.innerHTML = "";
      addBubble(label, "me");
      handler(label);
    });
    replies.appendChild(btn);
  });
}

function hasTrack(kind) {
  if (!state.stream) return false;
  return (kind === "video" ? state.stream.getVideoTracks() : state.stream.getAudioTracks()).length > 0;
}

function startCallTimer() {
  state.callSeconds = 0;
  callTimer.textContent = "00:00";
  pillTimer.textContent = "00:00";
  state.callTimerId = setInterval(() => {
    state.callSeconds += 1;
    const text = formatTime(state.callSeconds);
    callTimer.textContent = text;
    pillTimer.textContent = text;
  }, 1000);
}

function startCall() {
  state.callActive = true;
  state.dispatched = false;
  chat.innerHTML = "";
  replies.innerHTML = "";
  screenCall.classList.remove("is-connected");
  callStatus.textContent = "Menghubungkan…";
  callTimer.textContent = "00:00";
  backFromCallBtn.hidden = true;

  if (hasTrack("video")) {
    selfVideo.srcObject = state.stream;
    selfVideo.hidden = false;
    selfOff.hidden = true;
    const playing = selfVideo.play();
    if (playing && playing.catch) playing.catch(() => {});
  } else {
    selfVideo.hidden = true;
    selfOff.hidden = false;
  }

  micBtn.disabled = !hasTrack("audio");
  camBtn.disabled = !hasTrack("video");
  micBtn.setAttribute("aria-pressed", "false");
  camBtn.setAttribute("aria-pressed", "false");

  callLoc.textContent = state.coords
    ? "📍 Lokasi terkirim: " + state.coords.lat.toFixed(5) + ", " + state.coords.lng.toFixed(5) + " (±" + state.coords.acc + " m)"
    : "📍 Lokasi simulasi: Jl. Melati No. 14";

  show("call");
  addBubble("Menghubungkan ke operator PSC 119…", "sys");

  later(() => {
    screenCall.classList.add("is-connected");
    callStatus.textContent = "Terhubung · Rina";
    addBubble("Terhubung dengan operator", "sys");
    startCallTimer();
    operatorSay("Halo, saya Rina dari PSC 119. Lokasi Anda sudah kami terima. Apa yang terjadi?", () => {
      setReplies(CONDITIONS, onCondition);
    });
  }, 2500);
}

function onCondition(label) {
  state.condition = label;
  operatorSay("Baik. Apakah pasien masih sadar dan bernapas?", () => {
    setReplies(CONSCIOUS, onConscious);
  });
}

function onConscious(label) {
  state.conscious = label;
  operatorSay("Terima kasih. Sistem sedang mencari ambulans terdekat. Tetap tenang, panggilan tetap tersambung.", () => {
    state.dispatched = true;
    state.returnScreen = "search";
    later(startSearch, 1200);
  });
}

micBtn.addEventListener("click", () => {
  if (!hasTrack("audio")) return;
  const off = micBtn.getAttribute("aria-pressed") !== "true";
  state.stream.getAudioTracks().forEach((t) => {
    t.enabled = !off;
  });
  micBtn.setAttribute("aria-pressed", String(off));
  micBtn.setAttribute("aria-label", off ? "Nyalakan mikrofon" : "Matikan mikrofon");
});

camBtn.addEventListener("click", () => {
  if (!hasTrack("video")) return;
  const off = camBtn.getAttribute("aria-pressed") !== "true";
  state.stream.getVideoTracks().forEach((t) => {
    t.enabled = !off;
  });
  camBtn.setAttribute("aria-pressed", String(off));
  camBtn.setAttribute("aria-label", off ? "Nyalakan kamera" : "Matikan kamera");
  selfVideo.hidden = off;
  selfOff.hidden = !off;
});

function stopStream() {
  if (state.stream) {
    state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }
  selfVideo.srcObject = null;
}

function endCall() {
  state.callActive = false;
  if (state.callTimerId) clearInterval(state.callTimerId);
  state.callTimerId = null;
  callWave.classList.remove("is-speaking");
  callPill.hidden = true;
  stopStream();
}

endCallBtn.addEventListener("click", () => {
  if (!state.dispatched) {
    askConfirm("Akhiri panggilan?", "Permintaan ambulans akan dibatalkan.", "Akhiri", () => {
      resetAll();
      show("home");
    });
    return;
  }
  askConfirm("Akhiri panggilan?", "Ambulans tetap menuju lokasi Anda.", "Akhiri", () => {
    endCall();
    show(state.returnScreen);
    showToast("Panggilan diakhiri. Ambulans tetap menuju lokasi Anda.");
  });
});

callPill.addEventListener("click", () => {
  state.returnScreen = app.dataset.screen;
  backFromCallBtn.hidden = false;
  backFromCallBtn.setAttribute("aria-label", state.returnScreen === "search" ? "Kembali ke pencarian" : "Kembali ke pelacakan");
  show("call");
});

backFromCallBtn.addEventListener("click", () => {
  show(state.returnScreen);
});

function addUnit(unit) {
  const li = document.createElement("li");
  li.className = "unit-item" + (unit.free ? "" : " is-busy");
  li.dataset.id = unit.id;
  li.innerHTML =
    '<span class="unit-dot" aria-hidden="true"></span>' +
    '<span class="unit-text"><strong></strong><small></small></span>' +
    '<span class="unit-badge"></span>';
  li.querySelector("strong").textContent = unit.id + " · " + unit.base;
  li.querySelector("small").textContent = formatKm(unit.dist) + " · sekitar " + unit.eta + " menit";
  li.querySelector(".unit-badge").textContent = unit.free ? "Tersedia" : "Sedang bertugas";
  unitList.appendChild(li);

  const blip = radar.querySelector(unit.blip);
  blip.classList.add("is-on");
  if (unit.free) blip.classList.add("is-free");
}

function startSearch() {
  state.returnScreen = "search";
  unitList.innerHTML = "";
  foundCard.hidden = true;
  trackBtn.hidden = true;
  radar.classList.add("is-scanning");
  radar.querySelectorAll(".radar-blip").forEach((b) => {
    b.className = b.className.replace(/\s?is-(on|free|best)/g, "");
  });
  searchTitle.textContent = "Mencari ambulans terdekat…";
  searchLead.textContent = "Sistem memeriksa ambulans yang siaga di sekitar lokasi Anda.";

  show("search");

  UNITS.forEach((unit, i) => {
    later(() => addUnit(unit), 1200 + i * 1100);
  });

  later(onUnitFound, 1200 + UNITS.length * 1100 + 600);
}

function onUnitFound() {
  const best = UNITS.filter((u) => u.free).sort((a, b) => a.dist - b.dist)[0];
  state.unit = best;

  radar.classList.remove("is-scanning");
  radar.querySelector(best.blip).classList.add("is-best");

  const li = unitList.querySelector('[data-id="' + best.id + '"]');
  if (li) {
    li.classList.add("is-best");
    li.querySelector(".unit-badge").textContent = "Terdekat";
  }

  searchTitle.textContent = "Ambulans ditemukan";
  searchLead.textContent = best.id + " dari " + best.base + " sudah ditugaskan ke lokasi Anda.";
  $("#foundName").textContent = best.id + " · " + best.plate;
  $("#foundCrew").textContent = best.crew;
  $("#foundDist").textContent = formatKm(best.dist);
  $("#foundEta").textContent = best.eta + " menit";
  foundCard.hidden = false;
  trackBtn.hidden = false;

  if (state.callActive) {
    addBubble("Ambulans " + best.id + " sudah berangkat. Perkiraan tiba " + best.eta + " menit. Silakan pantau di layar pelacakan.", "op");
  }

  if (navigator.vibrate) navigator.vibrate(150);
  if (app.dataset.screen === "search") trackBtn.focus();
}

trackBtn.addEventListener("click", startTracking);

function placeMarker(progressValue) {
  const length = routeDone.getTotalLength();
  const point = routeDone.getPointAtLength(length * progressValue);
  ambMarker.style.transform = "translate(" + point.x + "px, " + point.y + "px)";
  routeDone.style.strokeDashoffset = String(length * (1 - progressValue));
}

function renderTrack(p) {
  const unit = state.unit;
  const left = 1 - p;

  placeMarker(p);
  trackFill.style.width = p * 100 + "%";

  if (p >= 1) {
    state.arrived = true;
    trackTitle.textContent = "Ambulans sudah tiba";
    trackSub.textContent = "Petugas sedang menangani pasien";
    etaBox.classList.add("is-arrived");
    etaMin.textContent = "✓";
    etaUnit.textContent = "tiba";
    trackDist.textContent = "Di lokasi Anda";
    trackStage.textContent = "Tiba";
    trackTip.textContent = "Ikuti arahan petugas. Siapkan kartu identitas dan obat pasien.";
    pickedUpBtn.hidden = false;
    return;
  }

  etaMin.textContent = String(Math.max(1, Math.ceil(unit.eta * left)));
  trackDist.textContent = formatKm(unit.dist * left) + " lagi";

  if (p < 0.12) {
    trackTitle.textContent = "Ambulans berangkat";
    trackStage.textContent = "Berangkat";
  } else if (p < 0.75) {
    trackTitle.textContent = "Ambulans dalam perjalanan";
    trackStage.textContent = "Dalam perjalanan";
  } else {
    trackTitle.textContent = "Ambulans hampir tiba";
    trackStage.textContent = "Hampir tiba";
    trackTip.textContent = "Buka pagar dan nyalakan lampu agar ambulans mudah menemukan Anda.";
  }
}

function startTracking() {
  const unit = state.unit;
  state.returnScreen = "track";
  state.arrived = false;

  $("#crewName").textContent = unit.id + " · " + unit.plate;
  $("#crewInfo").textContent = unit.crew;
  trackSub.textContent = "Dari " + unit.base + " menuju lokasi Anda";
  trackTip.textContent = TIPS[state.condition] || TIPS["Lainnya"];
  etaBox.classList.remove("is-arrived");
  etaUnit.textContent = "menit";
  pickedUpBtn.hidden = true;

  show("track");

  const length = routeDone.getTotalLength();
  routeDone.style.strokeDasharray = length + " " + length;
  ambMarker.style.transition = "none";
  renderTrack(0);
  ambMarker.getBoundingClientRect();
  ambMarker.style.transition = "";

  if (state.trackTimerId) clearInterval(state.trackTimerId);
  state.trackStart = Date.now();
  state.trackTimerId = setInterval(() => {
    const p = Math.min(1, (Date.now() - state.trackStart) / TRIP_MS);
    renderTrack(p);
    if (p >= 1) {
      clearInterval(state.trackTimerId);
      state.trackTimerId = null;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      showToast("Ambulans sudah tiba di lokasi Anda.");
    }
  }, 1000);
}

$("#callCrewBtn").addEventListener("click", () => {
  showToast("Contoh: menelepon petugas " + (state.unit ? state.unit.id : "ambulans") + " (simulasi).");
});

pickedUpBtn.addEventListener("click", () => {
  if (state.callActive) endCall();
  $("#fComplaint").value = state.condition && state.condition !== "Lainnya" ? state.condition : "";
  show("form");
});

function setFieldError(input, errorEl, message) {
  const field = input.closest(".field");
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    field.classList.add("has-error");
  } else {
    errorEl.hidden = true;
    field.classList.remove("has-error");
  }
}

patientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("#fName");
  const age = $("#fAge");
  const complaint = $("#fComplaint");

  const nameMsg = name.value.trim() ? "" : "Mohon isi nama pasien.";
  const ageVal = age.value.trim();
  const ageMsg = ageVal && (Number(ageVal) < 0 || Number(ageVal) > 120) ? "Usia 0–120." : "";
  const complaintMsg = complaint.value.trim() ? "" : "Mohon isi keluhan utama.";

  setFieldError(name, $("#fNameError"), nameMsg);
  setFieldError(age, $("#fAgeError"), ageMsg);
  setFieldError(complaint, $("#fComplaintError"), complaintMsg);

  if (nameMsg) {
    name.focus();
    return;
  }
  if (ageMsg) {
    age.focus();
    return;
  }
  if (complaintMsg) {
    complaint.focus();
    return;
  }

  const sex = patientForm.querySelector('input[name="fSex"]:checked');
  state.patient = {
    name: name.value.trim(),
    age: ageVal,
    sex: sex ? sex.value : "",
    relation: $("#fRelation").value,
    complaint: complaint.value.trim(),
    note: $("#fNote").value.trim()
  };
  show("rating");
});

["#fName", "#fAge", "#fComplaint"].forEach((selector) => {
  $(selector).addEventListener("input", () => {
    const input = $(selector);
    const err = $(selector + "Error");
    if (!err.hidden) setFieldError(input, err, "");
  });
});

function paintStars(value) {
  ratingForm.querySelectorAll(".stars label").forEach((label, i) => {
    label.classList.toggle("is-on", i < value);
  });
}

ratingForm.querySelectorAll('input[name="star"]').forEach((input) => {
  input.addEventListener("change", () => {
    state.rating = Number(input.value);
    paintStars(state.rating);
    starLabel.textContent = STAR_TEXT[state.rating];
    ratingError.hidden = true;
  });
});

ratingForm.querySelectorAll(".stars label").forEach((label, i) => {
  label.addEventListener("mouseenter", () => paintStars(i + 1));
  label.addEventListener("mouseleave", () => paintStars(state.rating));
});

ratingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.rating) {
    ratingError.hidden = false;
    return;
  }
  finish();
});

$("#skipRatingBtn").addEventListener("click", () => {
  state.rating = 0;
  finish();
});

function finish() {
  const now = new Date();
  const id =
    "SA-" +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "-" +
    String(Math.floor(1000 + Math.random() * 9000));
  const unit = state.unit || UNITS[2];
  const patient = state.patient || { name: "-", complaint: "-", age: "" };

  $("#doneHospital").textContent = unit.base;
  $("#sumId").textContent = id;
  $("#sumPatient").textContent = patient.name + (patient.age ? ", " + patient.age + " th" : "");
  $("#sumComplaint").textContent = patient.complaint;
  $("#sumUnit").textContent = unit.id + " · " + unit.plate;
  $("#sumEta").textContent = unit.eta + " menit";
  $("#sumRating").textContent = state.rating ? "★".repeat(state.rating) + "☆".repeat(5 - state.rating) : "Tidak dinilai";

  try {
    localStorage.setItem(
      "sa-last-report",
      JSON.stringify({ id: id, patient: patient, unit: unit.id, rating: state.rating, time: now.toISOString() })
    );
  } catch (e) {}

  show("done");
}

function resetAll() {
  clearAllLater();
  endCall();
  if (state.trackTimerId) clearInterval(state.trackTimerId);
  state.trackTimerId = null;
  state.coords = null;
  state.dispatched = false;
  state.returnScreen = "search";
  state.condition = "";
  state.conscious = "";
  state.unit = null;
  state.arrived = false;
  state.patient = null;
  state.rating = 0;
  chat.innerHTML = "";
  replies.innerHTML = "";
  unitList.innerHTML = "";
  patientForm.reset();
  ratingForm.reset();
  paintStars(0);
  starLabel.textContent = STAR_TEXT[0];
  ratingError.hidden = true;
  patientForm.querySelectorAll(".field-error").forEach((el) => {
    el.hidden = true;
  });
  patientForm.querySelectorAll(".has-error").forEach((el) => el.classList.remove("has-error"));
  resetPermissionScreen();
}

document.querySelectorAll("[data-cancel]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (app.dataset.screen === "permission" && !state.stream) {
      resetAll();
      show("home");
      return;
    }
    askConfirm("Batalkan permintaan?", "Ambulans tidak akan dikirim ke lokasi Anda.", "Batalkan", () => {
      resetAll();
      show("home");
      showToast("Permintaan ambulans dibatalkan.");
    });
  });
});

$("#homeBtn").addEventListener("click", () => {
  resetAll();
  show("home");
});

window.addEventListener("pagehide", stopStream);
