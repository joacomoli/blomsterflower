const OWNER_EMAIL = "hola@blomsterflower.com";
const FORM_ENDPOINT = "contact.php";

let galleryData = {};
const HERO_IMAGES = [
  "images/Tocados Artisticos/IMG_9382.jpg",
  "images/Arreglos Secos/IMG_2384.jpg",
  "images/Centros de mesa/IMG_5202.jpg",
  "images/Ramos de novia/IMG_0940.jpg",
  "images/Tocados Artisticos/IMG_0494.jpg"
];

let captchaAnswer = 0;

document.addEventListener("DOMContentLoaded", async () => {
  galleryData = await loadGalleryData();
  initHeroRotator();
  initSmoothScroll();
  setupLightbox();
  initGalleries(galleryData);
  initCaptcha();
  initForm();
  revealOnScroll();
});

async function loadGalleryData() {
  try {
    const response = await fetch("gallery-data.json");
    if (!response.ok) throw new Error("No se pudo cargar la galería");
    const json = await response.json();
    return json;
  } catch (err) {
    console.error("Error cargando gallery-data.json", err);
    return {};
  }
}

function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      const target = document.querySelector(targetId);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

function initGalleries(data) {
  document.querySelectorAll("[data-gallery]").forEach((wrapper) => {
    const key = wrapper.dataset.gallery;
    const group = data[key];
    const items = group?.items || [];
    const track = wrapper.querySelector(".gallery-track");
    if (!track || items.length === 0) return;

    items.forEach((item) => {
      const figure = document.createElement("figure");
      figure.dataset.type = item.type;
      if (item.type === "video") {
        const video = document.createElement("video");
        video.src = encodeURI(item.src);
        video.loading = "lazy";
        video.muted = true;
        video.loop = true;
        video.controls = true;
        video.playsInline = true;
        figure.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.loading = "lazy";
        img.decoding = "async";
        img.src = encodeURI(item.src);
        img.alt = group?.label || key.replace("-", " ");
        figure.appendChild(img);
      }
      track.appendChild(figure);
    });

    track.addEventListener("click", (event) => {
      const media = event.target.closest("img, video");
      if (!media) return;
      const figure = media.closest("figure");
      const type = figure?.dataset.type || "image";
      openLightbox(media.currentSrc || media.src, type);
    });

    const step = () => Math.max(wrapper.clientWidth * 0.75, 260);
    const prev = wrapper.querySelector('[data-dir="prev"]');
    const next = wrapper.querySelector('[data-dir="next"]');
    if (prev) {
      prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    }
    if (next) {
      next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    }
  });
}

function initCaptcha() {
  const refreshBtn = document.getElementById("refresh-captcha");
  const input = document.getElementById("captcha");
  refreshCaptcha();
  refreshBtn?.addEventListener("click", refreshCaptcha);
  input?.addEventListener("input", () => input.setCustomValidity(""));
}

function refreshCaptcha() {
  const a = Math.floor(Math.random() * 7) + 2;
  const b = Math.floor(Math.random() * 6) + 3;
  captchaAnswer = a + b;
  const label = document.getElementById("captcha-question");
  if (label) label.textContent = `${a} + ${b}`;
}

function initForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = document.getElementById("form-status");
  const submitBtn = document.getElementById("submit-btn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    const captchaInput = document.getElementById("captcha");
    if (!captchaInput || Number(captchaInput.value) !== captchaAnswer) {
      status.textContent = "Resolvé la verificación para continuar.";
      captchaInput?.focus();
      refreshCaptcha();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    status.textContent = "Enviando...";

    const payload = {
      nombre: form.nombre.value.trim(),
      email: form.email.value.trim(),
      telefono: form.telefono.value.trim(),
      servicio: form.servicio.value,
      mensaje: form.mensaje.value.trim(),
      _subject: `Nuevo contacto - ${form.servicio.value || "Blomster Flower"}`
    };

    try {
      await sendEmail(payload);
      status.textContent = "¡Gracias! Recibí tu mensaje y te responderé a la brevedad.";
      status.style.color = "var(--accent-strong)";
      form.reset();
      refreshCaptcha();
    } catch (error) {
      status.textContent = "No pudimos confirmar el envío automático. Se abrió tu correo para que no pierdas el mensaje.";
      status.style.color = "#b33a3a";
      fallbackMailto(payload);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

async function sendEmail(data) {
  const response = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.message || "No se pudo enviar el formulario");
  }
  return result;
}

function fallbackMailto(data) {
  const subject = data._subject || "Contacto Blomster Flower";
  const body = [
    `Nombre: ${data.nombre}`,
    `Email: ${data.email}`,
    `Teléfono: ${data.telefono || "-"}`,
    `Servicio de interés: ${data.servicio || "-"}`,
    "",
    data.mensaje
  ].join("\n");

  const mailto = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

function revealOnScroll() {
  const observed = document.querySelectorAll(".service-card, .travel-card, .contact-card");
  observed.forEach((el) => el.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  observed.forEach((el) => observer.observe(el));
}

function setupLightbox() {
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  const content = document.createElement("div");
  content.className = "lightbox-content";
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.remove("open");
    content.innerHTML = "";
  };

  overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  window.openLightbox = (src, type = "image") => {
    content.innerHTML = "";
    if (type === "video") {
      const video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      content.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Blomster Flower";
      content.appendChild(img);
    }
    overlay.classList.add("open");
  };
}

function initHeroRotator() {
  const heroImg = document.querySelector(".hero-frame img");
  if (!heroImg || HERO_IMAGES.length === 0) return;
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % HERO_IMAGES.length;
    heroImg.style.opacity = 0;
    setTimeout(() => {
      heroImg.src = HERO_IMAGES[idx];
      heroImg.onload = () => {
        heroImg.style.opacity = 1;
      };
    }, 200);
  }, 3000);
}
