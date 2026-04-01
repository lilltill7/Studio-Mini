// ── DASHBOARD EXPAND / COLLAPSE ──
function expand(panel) {
  document.getElementById('fs-' + panel).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function collapse() {
  document.querySelectorAll('.fullscreen').forEach(f => f.classList.add('hidden'));
  document.body.style.overflow = '';
  updateLyricsPreview();
  updateDashAudioCount();
}

// ── HELPERS ──
function fmtTime(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ── LYRICS ──
document.getElementById('lyricsBox').addEventListener('input', () => {
  const val = document.getElementById('lyricsBox').value.trim();
  const words = val ? val.split(/\s+/).length : 0;
  document.getElementById('wordCount').textContent = words + ' word' + (words !== 1 ? 's' : '');
});

function insertTag(el, section) {
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const box = document.getElementById('lyricsBox');
  box.value += (box.value ? '\n\n' : '') + '[' + section + ']\n';
  box.focus();
}

function clearLyrics() {
  if (confirm('clear all lyrics?')) {
    document.getElementById('lyricsBox').value = '';
    document.getElementById('wordCount').textContent = '0 words';
    updateLyricsPreview();
  }
}

function updateLyricsPreview() {
  const val = document.getElementById('lyricsBox').value;
  const preview = document.getElementById('lyricsPreview');
  if (!val.trim()) {
    preview.innerHTML = '<span class="preview-empty">tap to write...</span>';
  } else {
    preview.textContent = val.slice(0, 200);
  }
}

// ── AUDIO ──
let audioRec = false, audioTimer, audioSecs = 0;
let mediaRecorder, audioChunks = [], audioClips = [];

async function toggleAudio() {
  const btn = document.getElementById('audioBtn');
  const status = document.getElementById('audioStatus');
  const micDot = document.getElementById('dashMicDot');
  const micRing = document.querySelector('.mic-ring');

  if (!audioRec) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        audioClips.push({ url: URL.createObjectURL(blob), dur: audioSecs, name: 'take ' + (audioClips.length + 1) });
        stream.getTracks().forEach(t => t.stop());
        renderAudioClips();
        updateDashAudioCount();
      };
      mediaRecorder.start();
      audioRec = true;
      audioSecs = 0;
      btn.classList.add('recording');
      if (micDot) micDot.classList.add('active');
      if (micRing) micRing.classList.add('active');
      status.textContent = '● recording';
      audioTimer = setInterval(() => {
        audioSecs++;
        document.getElementById('audioTimer').textContent = fmtTime(audioSecs);
      }, 1000);
    } catch(e) {
      status.textContent = 'mic access denied';
    }
  } else {
    mediaRecorder.stop();
    audioRec = false;
    btn.classList.remove('recording');
    if (micDot) micDot.classList.remove('active');
    if (micRing) micRing.classList.remove('active');
    status.textContent = 'tap to record';
    document.getElementById('audioTimer').textContent = '0:00';
    clearInterval(audioTimer);
  }
}

function renderAudioClips() {
  const el = document.getElementById('audioClips');
  const count = document.getElementById('audioCount');
  count.textContent = audioClips.length + ' clip' + (audioClips.length !== 1 ? 's' : '');
  if (!audioClips.length) { el.innerHTML = '<p class="empty">no recordings yet</p>'; return; }
  el.innerHTML = audioClips.map((c, i) => `
    <div class="clip">
      <button class="play-btn" onclick="playAudio(${i})">▶</button>
      <div style="flex:1">
        <div class="clip-name">${c.name}</div>
        <div class="clip-meta">${fmtTime(c.dur)}</div>
      </div>
      <a class="dl-btn" href="${c.url}" download="${c.name}.webm">dl</a>
      <button class="del-btn" onclick="deleteAudio(${i})">×</button>
    </div>
  `).join('');
}

function updateDashAudioCount() {
  const el = document.getElementById('dashAudioCount');
  if (audioClips.length > 0) {
    el.textContent = audioClips.length + ' clip' + (audioClips.length !== 1 ? 's' : '');
  } else {
    el.textContent = '';
  }
}

let currentAudio = null;
function playAudio(i) {
  if (currentAudio) currentAudio.pause();
  currentAudio = new Audio(audioClips[i].url);
  currentAudio.play();
}

function deleteAudio(i) {
  audioClips.splice(i, 1);
  renderAudioClips();
  updateDashAudioCount();
}

// ── VIDEO ──
let cameraOn = false, videoRec = false, videoTimer, videoSecs = 0;
let videoMediaRec, videoChunks = [], videoClips = [];
let camStream = null;

async function toggleCamera() {
  const btn = document.getElementById('camBtn');
  const videoEl = document.getElementById('videoEl');
  const placeholder = document.getElementById('vidPlaceholder');
  const recBtn = document.getElementById('vidRecBtn');

  if (!cameraOn) {
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoEl.srcObject = camStream;
      videoEl.style.display = 'block';
      placeholder.style.display = 'none';
      cameraOn = true;
      btn.textContent = 'stop camera';
      recBtn.classList.remove('hidden');
    } catch(e) {
      btn.textContent = 'camera denied';
    }
  } else {
    if (videoRec) toggleVideoRec();
    camStream.getTracks().forEach(t => t.stop());
    videoEl.style.display = 'none';
    placeholder.style.display = 'flex';
    cameraOn = false;
    btn.textContent = 'start camera';
    recBtn.classList.add('hidden');
  }
}

function toggleVideoRec() {
  const btn = document.getElementById('vidRecBtn');
  const indicator = document.getElementById('recIndicator');

  if (!videoRec) {
    videoChunks = [];
    videoMediaRec = new MediaRecorder(camStream);
    videoMediaRec.ondataavailable = e => videoChunks.push(e.data);
    videoMediaRec.onstop = () => {
      const blob = new Blob(videoChunks, { type: 'video/webm' });
      videoClips.push({ url: URL.createObjectURL(blob), dur: videoSecs, name: 'clip ' + (videoClips.length + 1) });
      renderVideoClips();
    };
    videoMediaRec.start();
    videoRec = true;
    videoSecs = 0;
    btn.textContent = 'stop';
    indicator.classList.remove('hidden');
    videoTimer = setInterval(() => { videoSecs++; }, 1000);
  } else {
    videoMediaRec.stop();
    videoRec = false;
    btn.textContent = 'record';
    indicator.classList.add('hidden');
    clearInterval(videoTimer);
  }
}

function renderVideoClips() {
  const el = document.getElementById('videoClips');
  const count = document.getElementById('vidCount');
  count.textContent = videoClips.length + ' clip' + (videoClips.length !== 1 ? 's' : '');
  if (!videoClips.length) { el.innerHTML = '<p class="empty">no clips yet</p>'; return; }
  el.innerHTML = videoClips.map((c, i) => `
    <div class="clip">
      <div style="flex:1">
        <div class="clip-name">${c.name}</div>
        <div class="clip-meta">${fmtTime(c.dur)}</div>
      </div>
      <a class="dl-btn" href="${c.url}" download="${c.name}.webm">dl</a>
    </div>
  `).join('');
}

// ── SAVE ──
function saveIdea() {
  const btn = document.getElementById('saveBtn');
  btn.textContent = '✓ saved';
  btn.classList.add('saved');
  setTimeout(() => {
    btn.textContent = 'save';
    btn.classList.remove('saved');
  }, 2000);
}