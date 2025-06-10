const canvas = document.getElementById("psyCanvas");
const ctx = canvas.getContext("2d");
let width, height, time = 0;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// UI
document.getElementById("ui-toggle").addEventListener("click", () => {
  const panel = document.getElementById("config-panel");
  panel.style.display = (panel.style.display === "flex") ? "none" : "flex";
});
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

// AUDIO
const audio = document.getElementById("bgAudio");
const startBtn = document.getElementById("startBtn");
const introScreen = document.getElementById("intro-screen");

let analyser, dataArray;
let bass = 0, mids = 0, highs = 0;

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
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length / 255;
  bass = avg(dataArray.slice(0, 10));
  mids = avg(dataArray.slice(10, 40));
  highs = avg(dataArray.slice(40));
  requestAnimationFrame(updateAudio);
}

// DRAW
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
          r = 128 + 127 * Math.sin(dist * (0.02 + bass * 0.05) - time);
          g = 128 + 127 * Math.cos(angle * (3 + mids * 5) + time);
          b = 128 + 127 * Math.sin(dist * (0.01 + highs * 0.03) + time);
          break;
        case "waves":
          r = 128 + 127 * Math.sin(px * 0.01 + time + mids * 10);
          g = 128 + 127 * Math.sin(py * 0.01 + time * 1.5);
          b = 128 + 127 * Math.sin((px + py) * 0.01 + time + bass * 3);
          break;
        case "plasma":
          const v = Math.sin(px * (0.02 + highs * 0.05) + time)
                  + Math.sin(py * (0.02 + mids * 0.03) + time);
          r = 128 + 127 * Math.sin(v + time + bass * 3);
          g = 128 + 127 * Math.sin(v + time * 1.3);
          b = 128 + 127 * Math.sin(v + time * 1.6 + highs * 2);
          break;
        case "spiral":
          let rad = dist;
          let a = angle + time;
          r = 128 + 127 * Math.sin(rad * (0.05 + bass) - a + mids * 3);
          g = 128 + 127 * Math.cos(rad * 0.03 + a + time);
          b = 128 + 127 * Math.sin(rad * 0.01 + a - time + highs * 2);
          break;
        case "netgrid":
          r = 128 + 127 * Math.sin((px + py + time * 100) * 0.01 + bass * 3);
          g = 128 + 127 * Math.sin((px - py + time * 50) * 0.01 + mids * 5);
          b = 128 + 127 * Math.cos((px * py + time * 25) * 0.00005 + highs * 4);
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

