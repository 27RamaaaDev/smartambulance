const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");
const requestDialog = document.querySelector("#requestDialog");
const requestForm = document.querySelector("#requestForm");
const demoResult = document.querySelector("#demoResult");
const resultMessage = document.querySelector("#resultMessage");
const patientPhone = document.querySelector("#patientPhone");
let lastTrigger = null;

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Buka menu" : "Tutup menu");
  mainNav.classList.toggle("is-open", !isOpen);
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Buka menu");
    mainNav.classList.remove("is-open");
  });
});

document.querySelectorAll("[data-open-request]").forEach((button) => {
  button.addEventListener("click", () => {
    lastTrigger = button;
    requestDialog.showModal();
  });
});

document.querySelectorAll("[data-call-preview]").forEach((button) => {
  button.addEventListener("click", () => {
    resultMessage.textContent = "Mockup saja: panggilan tidak dilakukan. Untuk bantuan nyata, hubungi PSC 119 melalui telepon Anda.";
    demoResult.hidden = false;
  });
});

document.querySelector("[data-close-dialog]").addEventListener("click", () => requestDialog.close());

requestDialog.addEventListener("click", (event) => {
  if (event.target === requestDialog) requestDialog.close();
});

requestDialog.addEventListener("close", () => {
  if (lastTrigger) lastTrigger.focus();
});

patientPhone.addEventListener("input", () => {
  const digits = patientPhone.value.replace(/\D/g, "");
  patientPhone.setCustomValidity(digits.length >= 8 && digits.length <= 15 ? "" : "Masukkan nomor telepon dengan 8 sampai 15 angka.");
});

requestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  resultMessage.textContent = "Ringkasan ini hanya pratinjau. Data tidak disimpan atau dikirim. Untuk bantuan nyata, hubungi PSC 119 melalui telepon Anda.";
  requestDialog.close();
  requestForm.reset();
  patientPhone.setCustomValidity("");
  demoResult.hidden = false;
});

document.querySelector("#dismissResult").addEventListener("click", () => {
  demoResult.hidden = true;
});

document.querySelector("#currentYear").textContent = String(new Date().getFullYear());
