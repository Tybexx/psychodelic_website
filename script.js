const canvas = document.getElementById("psyCanvas");
const ctx = canvas.getContext("2d");
let width, height, time = 0;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// UI toggle
document.getElementById("ui-toggle").addEventListener("click", () => {
  const panel = document.getElementById("config-panel");
  panel.style.display = (panel.style.display === "flex") ? "none" : "flex";
});

// Settings
const themeSelect = document.getElementById("themeSelect");
const speedSlider = document.getElementById("speedSlider");
const colorSlider = document.getElementById("colorSlider");
const resSlider = document.getElementById("resSlider");

function loadSettings() {
  themeSelect.value = localStorage.getItem("theme") || "vortex";
  speedSlider.value = localStorage.getItem("speed") || "1";
  colorSlider.value = localStorage.getItem("color") || "1";
  resSlider.value = localStorage.getItem("res") || "4";
}
function saveSettings() {
  localStorage.setItem("theme", themeSelect.value);
  localStorage.setItem("speed", speedSlider.value);
  localStorage.setItem("color", colorSlider.value);
  localStorage.setItem("res", resSlider.value);
}
[themeSelect, speedSlider, colorSlider, resSlider].forEach(el =>
  el.addEventListener("input", saveSettings)
);
loadSettings();

// Audio setup after user click
const startBtn = document.getElementById("startBtn");
const introScreen = document.getElementById("intro-screen");
const audio = document.getElementById("bgAudio");

let analyser, dataArray, audioLevel = 0;

startBtn.addEventListener("click", async () => {
  introScreen.style.display = "none";
  try {
    await audio.play();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 128;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    updateAudio();
  } catch (e) {
    alert("Audio failed to start: " + e);
  }
});

function updateAudio() {
  if (!analyser) return;
  analyser.getByteFrequencyData(dataArray);
  audioLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
  requestAnimationFrame(updateAudio);
}

// Visual render
function animate() {
  time += 0.01 * parseFloat(speedSlider.value);
  const res = parseInt(resSlider.value);
  const cw = Math.floor(width / res);
  const ch = Math.floor(height / res);
  const img = ctx.createImageData(cw, ch);
  const data = img.data;
  const colorMod = parseFloat(colorSlider.value);
  const theme = themeSelect.value;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const px = x * res;
      const py = y * res;
      const dx = px - width / 2;
      const dy = py - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      let r = 0, g = 0, b = 0;

      switch (theme) {
        case "vortex":
          r = 128 + 127 * Math.sin(dist * 0.02 - time + audioLevel * 10);
          g = 128 + 127 * Math.cos(angle * 3 + time);
          b = 128 + 127 * Math.sin(dist * 0.01 + time);
          break;
        case "waves":
          r = 128 + 127 * Math.sin(px * 0.01 + time + audioLevel * 3);
          g = 128 + 127 * Math.sin(py * 0.01 + time * 1.5);
          b = 128 + 127 * Math.sin((px + py) * 0.01 + time);
          break;
        case "plasma":
          const v = Math.sin(px * 0.02 + time) + Math.sin(py * 0.02 + time);
          r = 128 + 127 * Math.sin(v + time + audioLevel * 2);
          g = 128 + 127 * Math.sin(v + time * 1.3);
          b = 128 + 127 * Math.sin(v + time * 1.6);
          break;
        case "spiral":
          let rad = Math.sqrt(dx * dx + dy * dy);
          let a = angle + time;
          r = 128 + 127 * Math.sin(rad * 0.05 - a + audioLevel * 3);
          g = 128 + 127 * Math.cos(rad * 0.03 + a + time);
          b = 128 + 127 * Math.sin(rad * 0.01 + a - time);
          break;
        case "netgrid":
          r = 128 + 127 * Math.sin((px + py + time * 100) * 0.01 + audioLevel);
          g = 128 + 127 * Math.sin((px - py + time * 50) * 0.01);
          b = 128 + 127 * Math.cos((px * py + time * 25) * 0.00005);
          break;
      }

      data[i] = r * colorMod;
      data[i + 1] = g * colorMod;
      data[i + 2] = b * colorMod;
      data[i + 3] = 255;
    }
  }

  const imgCanvas = document.createElement("canvas");
  imgCanvas.width = cw;
  imgCanvas.height = ch;
  const imgCtx = imgCanvas.getContext("2d");
  imgCtx.putImageData(img, 0, 0);
  ctx.drawImage(imgCanvas, 0, 0, width, height);
  requestAnimationFrame(animate);
}
animate();
