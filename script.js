const canvas = document.getElementById("psyCanvas");
const ctx = canvas.getContext("2d");
let width, height, time = 0;
resize();
window.addEventListener("resize", resize);
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

// UI
const config = {
  speed: 1,
  color: 1,
  res: 4,
  duration: 20,
  mode: 'auto',
  debug: false
};

const controls = {
  speed: document.getElementById("speedSlider"),
  color: document.getElementById("colorSlider"),
  res: document.getElementById("resSlider"),
  duration: document.getElementById("phaseDuration"),
  mode: document.getElementById("phaseMode"),
  phase: document.getElementById("phaseSelector"),
  debug: document.getElementById("debugToggle")
};

document.getElementById("ui-toggle").onclick = () => {
  const p = document.getElementById("config-panel");
  p.style.display = p.style.display === "flex" ? "none" : "flex";
};

// Update from UI
Object.keys(controls).forEach(key => {
  controls[key].oninput = () => {
    if (key === "debug") config.debug = controls.debug.checked;
    else config[key] = controls[key].value;
    localStorage.setItem("tripConfig", JSON.stringify(config));
  };
});

// Load settings
const saved = JSON.parse(localStorage.getItem("tripConfig") || "{}");
Object.assign(config, saved);
controls.speed.value = config.speed;
controls.color.value = config.color;
controls.res.value = config.res;
controls.duration.value = config.duration;
controls.mode.value = config.mode;
controls.debug.checked = config.debug;

// PHASE ENGINE
const phases = [
  { name: "Spiral Bloom", fn: (x, y, a, d, t) =>
    [Math.sin(d * 0.05 - a + t), Math.cos(a + t * 0.5), Math.sin(d * 0.01 + a + t)] },
  { name: "Waveline Grid", fn: (x, y, a, d, t) =>
    [Math.sin(x * 0.01 + t), Math.sin(y * 0.01 + t), Math.sin((x + y) * 0.01 + t)] },
  { name: "Plasma Flux", fn: (x, y, a, d, t) => {
    const v = Math.sin(x * 0.02 + t) + Math.sin(y * 0.02 + t);
    return [Math.sin(v + t), Math.sin(v + t * 1.2), Math.sin(v + t * 1.4)];
  }},
  { name: "Net Pulse", fn: (x, y, a, d, t) =>
    [Math.sin((x + y + t * 100) * 0.01), Math.sin((x - y + t * 50) * 0.01), Math.cos((x * y + t * 25) * 0.00005)] }
];

phases.forEach((p, i) => {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = p.name;
  controls.phase.appendChild(opt);
});

let current = 0;
let next = 1;
let transition = 0;
let lastSwitch = 0;

// AUDIO
let analyser, dataArray, bass = 0, mids = 0, highs = 0;
const audio = document.getElementById("bgAudio");
const intro = document.getElementById("intro-screen");

document.getElementById("startBtn").onclick = async () => {
  intro.style.display = "none";
  await audio.play();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const src = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  src.connect(analyser);
  analyser.connect(audioCtx.destination);
  analyser.fftSize = 128;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  updateAudio();
};

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
  time += 0.01 * parseFloat(config.speed);
  const res = parseInt(config.res);
  const cw = Math.floor(width / res);
  const ch = Math.floor(height / res);
  const img = ctx.createImageData(cw, ch);
  const data = img.data;

  if (config.mode === "auto" && performance.now() - lastSwitch > config.duration * 1000) {
    current = next;
    do { next = Math.floor(Math.random() * phases.length); } while (next === current);
    lastSwitch = performance.now();
    transition = 0;
    if (config.debug) console.log(`Switching to phase: ${phases[current].name}`);
  }

  if (config.mode === "manual") {
    current = parseInt(controls.phase.value);
    next = current;
  }

  transition = Math.min(1, (performance.now() - lastSwitch) / 1000);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const px = x * res;
      const py = y * res;
      const dx = px - width / 2;
      const dy = py - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const t = time + bass * 5;

      const p1 = phases[current].fn(px, py, angle, dist, t);
      const p2 = phases[next].fn(px, py, angle, dist, t);
      const mix = (a, b) => a * (1 - transition) + b * transition;

      const r = 128 + 127 * mix(p1[0], p2[0]) * config.color;
      const g = 128 + 127 * mix(p1[1], p2[1]) * config.color;
      const b = 128 + 127 * mix(p1[2], p2[2]) * config.color;

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
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

