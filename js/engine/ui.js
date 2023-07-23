const ui = {
  globalSettings: document.getElementById("global-settings"),

  playButton: document.getElementById("play"),
  recordButton: document.getElementById("record"),

  timeline: document.getElementById("timeline"),
  timelineInfo: document.getElementById("timeline-info"),
  timelineRuler: document.getElementById("timeline-ruler"),
  playhead: document.getElementById("playhead"),
  componentLog: document.getElementById("component-log"),

  inspectorContainer: document.getElementById("inspector-container"),
  inspector: document.getElementById("inspector"),

  eventInspector: {
    keydown: document.querySelector("#event-inspector [name='keydown']"),
    keyup: document.querySelector("#event-inspector [name='keyup']"),
    code: document.querySelector("#event-inspector [name='code']"),
    key: document.querySelector("#event-inspector [name='key']"),
    listen: document.querySelector("#event-inspector [name='listen']"),
    listening: document.querySelector("#event-inspector [name='listening']"),
    local: document.querySelector("#event-inspector [name='local']"),
    global: document.querySelector("#event-inspector [name='global']"),
    delete: document.querySelector("#event-inspector [name='delete']")
  },

  clipInspector: {
    join: document.querySelector("#clip-inspector [name='join']"),
    timestamp: document.querySelector("#clip-inspector [name='timestamp']"),
    length: document.querySelector("#clip-inspector [name='length']"),
    trimStart: document.querySelector("#clip-inspector [name='trim-start']"),
    trimLength: document.querySelector("#clip-inspector [name='trim-length']"),
    duplicate: document.querySelector("#clip-inspector [name='duplicate']"),
    delete: document.querySelector("#clip-inspector [name='delete']")
  },

  trackInspector: {
    playhead: document.querySelector("#track-inspector [name='playhead']"),
    lock: document.querySelector("#track-inspector [name='lock']"),
    mute: document.querySelector("#track-inspector [name='mute']"),
    delete: document.querySelector("#track-inspector [name='delete']")
  }
};

// safari drag cursor fix ??
document.onselectstart = function() { return false; }

function toggleGone(element, button) {
  button.toggleAttribute("checked");
  if (button.getAttribute("checked") != null) {
    element.classList.remove("gone");
  } else {
    element.classList.add("gone");
  }
}
