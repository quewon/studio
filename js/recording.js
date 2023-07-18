var ui = {
  playButton: document.getElementById("play"),
  playhead: document.getElementById("playhead"),
  timelineInfo: document.getElementById("timeline-info")
};

var lastTick = Date.now();
tick();

function tick() {
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = Date.now();
  requestAnimationFrame(tick);

  if (playing) {
    setPlayheadTime(playheadTime + delta);
    if (playheadTime >= totalTime) {
      setPlayheadTime(totalTime);
      stopPlaying();
    }
  }
}

var totalTime = 0;
var playheadTime = 0;
var trackRatio = 0;
var playing = false;

function setPlayheadTime(value) {
  const prevValue = playheadTime;
  playheadTime = value;

  updateOutput();

  ui.playhead.style.left = (playheadTime / trackRatio)+"%";

  var total = Math.ceil(totalTime);
  var elapsed = Math.ceil(playheadTime);

  ui.timelineInfo.textContent = "E "+elapsed+" T "+total;
}

function updateOutput() {

}

function togglePlaying() {
  const button = ui.playButton;

  button.toggleAttribute("checked");
  if (button.getAttribute("checked") != null) {
    button.textContent = "stop";
    playing = true;
  } else {
    stopPlaying();
  }
}

function stopPlaying() {
  const button = ui.playButton;

  button.removeAttribute("checked");
  button.textContent = "play";
  playing = false;
}

function importBaked(data) {
  
}
