const ui = {
  timeline: document.getElementById("timeline"),
  timelineInfo: document.getElementById("timeline-info"),
  timelineRuler: document.getElementById("timeline-ruler"),
  playhead: document.getElementById("playhead"),
  componentLog: document.getElementById("component-log"),
  inspector: document.getElementById("inspector"),

  recordButton: document.querySelector("[name='record']"),

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
    delete: document.querySelector("#clip-inspector [name='delete']")
  },

  trackInspector: {
    lock: document.querySelector("#track-inspector [name='lock']"),
    delete: document.querySelector("#track-inspector [name='delete']")
  }
};

var trackRatio = 1;
var totalTime = 0;
var playheadTime = 0;
var playing = false;
var clipDragging;
var clipSelected;
var handleDragging;
var listeningForEditor = false;
var focusedOnInput = false;

var settings = {
  startRecordOnInput: false,
  clearWithEnter: false,
  assembleHangul: true
};
function toggleSetting(settingName, button) {
  button.toggleAttribute("checked");
  settings[settingName] = button.getAttribute("checked") != null;
  updateOutput();
}

var currentTrack;
var allTracks = [];
new Track();

function handleEvent(e) {
  currentTrack.handleEvent(e);
}

var keydownEvents = [];
document.addEventListener("keydown", function(e) {
  if (!currentTrack.recording && !listeningForEditor && !focusedOnInput && e.key == "Backspace") {
    if (eventBeingEdited) {
      if (confirm("are you sure you want to delete this event? (warning: this action is not reversible!)")) {
        eventBeingEdited.remove();
      }
    } else if (clipSelected) {
      if (confirm("are you sure you want to delete this clip? (warning: this action is not reversible!)")) {
        clipSelected.remove();
      }
    } else if (allTracks.length > 1 && !currentTrack.locked) {
      if (confirm("are you sure you want to delete this track? (warning: this action is not reversible!)")) {
        currentTrack.remove();
      }
    }
  }

  if (listeningForEditor) {
    stopListening();
    eventBeingEdited.code = e.code;
    eventBeingEdited.key = e.key;
    eventBeingEdited.updateLogElement();
    ui.eventInspector.key.textContent = eventBeingEdited.key;
    ui.eventInspector.code.textContent = eventBeingEdited.code;
    updateOutput();
  }

  if (currentTrack.recording) {
    e.preventDefault();
  }

  if (!playing) {
    if (!currentTrack.recording && settings.startRecordOnInput) {
      currentTrack.toggleRecording(e);
    }

    if (e.key == "Enter" && settings.clearWithEnter) {
      e.preventDefault();
    }
  }

  handleEvent(e);
  keydownEvents.push(e);
});
document.addEventListener("keyup", function(e) {
  if (e.key == "Meta") {
    for (let i=keydownEvents.length-1; i>=0; i--) {
      if (keydownEvents[i].metaKey && keydownEvents[i].key != "Meta") {
        keydownEvents.splice(i, 1);
      }
    }
    handleEvent(e);
  } else {
    for (let i=keydownEvents.length-1; i>=0; i--) {
      if (keydownEvents[i].code == e.code) {
        keydownEvents.splice(i, 1);
        handleEvent(e);
        break;
      }
    }
  }
});
document.addEventListener("mousedown", function(e) {
  if (clipSelected && (e.target == document.body || e.target == document.documentElement)) {
    clipSelected.deselect();
  }
});
document.addEventListener("mousemove", function(e) {
  if (clipDragging) clipDragging.move(e.pageX);
  if (draggingPlayhead) {
    movePlayhead(e.pageX);
  }
  if (handleDragging) handleDragging.move(e.pageX);
});
document.addEventListener("mouseup", function(e) {
  if (clipDragging) clipDragging.drop();
  if (draggingPlayhead) dropPlayhead();
  if (handleDragging) handleDragging.drop();
});
document.addEventListener("blur", function() {
  if (clipDragging) clipDragging.drop();
  if (draggingPlayhead) dropPlayhead();
});

var lastTick = Date.now();
tick();

function tick() {
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = Date.now();
  requestAnimationFrame(tick);

  currentTrack.update(delta);

  if (playing) {
    setPlayheadTime(playheadTime + delta);
    if (playheadTime >= totalTime) {
      setPlayheadTime(totalTime);
      stopPlaying();
    }
  }

  if (playing || currentTrack.recording) {
    updateTimeline();
  }
}

function updateOutput() {
  for (let track of allTracks) {
    track.simulator.printStateAtTimestamp(track.orderedEventLog, playheadTime);
  }
}

function setPlayheadTime(value) {
  const prevValue = playheadTime;
  playheadTime = value;

  updateOutput();

  ui.playhead.style.left = (playheadTime / trackRatio)+"%";
  ui.timelineInfo.textContent = "TRACK LENGTH: "+Math.ceil(totalTime)+" | PLAYHEAD: "+Math.ceil(playheadTime);
}

function setTotalTime(value) {
  if (totalTime != value) {
    totalTime = value;
    trackRatio = totalTime / 100;
    ui.timelineInfo.textContent = "TRACK LENGTH: "+Math.ceil(totalTime)+" | PLAYHEAD: "+Math.ceil(playheadTime);

    if (trackRatio == 0) {
      ui.timelineRuler.style.backgroundSize = "100% 100%";
    } else {
      ui.timelineRuler.style.backgroundSize = (1000 / trackRatio)+"% 100%";
    }

    for (let track of allTracks) {
      for (let clip of track.clips) {
        if (clip == this) continue;
        clip.updateTimelineElement();
      }
    }
  }
}

function updateTimeline() {
  for (let track of allTracks) {
    for (let clip of track.clips) {
      clip.updateTimelineElement();
    }
    if (track.currentClip) track.currentClip.updateTimelineElement();
  }
}

function togglePlaying() {
  if (playing) {
    stopPlaying();
  } else {
    if (currentTrack.recording) {
      currentTrack.stopRecording();
    }
    if (playheadTime >= totalTime) {
      playheadTime = -1;
    }
    startPlaying();
  }
}

function startPlaying() {
  playing = true;
  document.body.classList.add("playing");
}

function stopPlaying() {
  playing = false;
  document.body.classList.remove("playing");
}

// moving the playhead

var draggingPlayhead = false;
var timelineRulerRect = ui.timelineRuler.getBoundingClientRect();

ui.timelineRuler.addEventListener("mousedown", function(e) {
  draggingPlayhead = true;
  movePlayhead(e.pageX);
});

window.addEventListener("resize", function() {
  timelineRulerRect = ui.timelineRuler.getBoundingClientRect();
});

function movePlayhead(mousePosition) {
  const position = mousePosition - timelineRulerRect.left;
  const pixel = totalTime / timelineRulerRect.width;
  setPlayheadTime(Math.max(Math.min(position * pixel, totalTime), 0));
}

function dropPlayhead() {
  draggingPlayhead = false;
}

// track management

function createTrack() {
  new Track();
}

// inspector

function setInspectorMode(className) {
  ui.inspector.classList.remove("track");
  ui.inspector.classList.remove("clip");
  ui.inspector.classList.remove("event");
  ui.inspector.classList.add(className);
}

// event inspector

var eventBeingEdited;
function startEditingEvent(e) {
  if (eventBeingEdited && eventBeingEdited != e) {
    stopEditingEvent(eventBeingEdited);
  }
  eventBeingEdited = e;
  setInspectorMode("event");

  const inspector = ui.eventInspector;

  inspector.keyup.removeAttribute("checked");
  inspector.keydown.removeAttribute("checked");

  if (e.type == "keydown") {
    inspector.keydown.setAttribute("checked", true);
  } else {
    inspector.keyup.setAttribute("checked", true);
  }

  inspector.code.textContent = e.code;
  inspector.key.textContent = e.key;
  inspector.listening.classList.add("gone");

  inspector.local.value = e.localTimeStamp;
  inspector.global.value = e.clip.startTime + e.localTimeStamp;
}

function stopEditingEvent(e) {
  stopListening();
  e.logElement.removeAttribute("checked");
  setInspectorMode("clip");
  listeningForEditor = false;
  eventBeingEdited = null;
}

function stopListening() {
  listeningForEditor = false;
  ui.inspector.classList.remove("listening");
}

ui.eventInspector.listen.onclick = function() {
  if (listeningForEditor) {
    stopListening();
  } else {
    listeningForEditor = true;
    ui.inspector.classList.add("listening");
  }
};

ui.eventInspector.keydown.onclick = function() {
  ui.eventInspector.keydown.setAttribute("checked", true);
  ui.eventInspector.keyup.removeAttribute("checked");
  eventBeingEdited.type = "keydown";
  eventBeingEdited.updateLogElement();
  updateOutput();
};

ui.eventInspector.keyup.onclick = function() {
  ui.eventInspector.keyup.setAttribute("checked", true);
  ui.eventInspector.keydown.removeAttribute("checked");
  eventBeingEdited.type = "keyup";
  eventBeingEdited.updateLogElement();
  updateOutput();
};

ui.eventInspector.local.onfocus = ui.eventInspector.global.onfocus = function() {
  focusedOnInput = true;
};
ui.eventInspector.local.onblur = ui.eventInspector.global.onblur = function() {
  focusedOnInput = false;
};
ui.eventInspector.local.onchange = function() {
  const e = eventBeingEdited;
  if (!e) return;
  e.setLocalTimeStamp(ui.eventInspector.local.value);
  ui.eventInspector.value = e.clip.startTime + e.localTimeStamp;
};
ui.eventInspector.global.onchange = function() {
  const e = eventBeingEdited;
  if (!e) return;
  const globalTime = e.localTimeStamp + e.clip.startTime;
  const delta = ui.eventInspector.global.value - globalTime;
  e.setLocalTimeStamp(e.localTimeStamp + delta);
  ui.eventInspector.local.value = e.localTimeStamp;
};

ui.eventInspector.delete.onclick = function() {
  eventBeingEdited.remove();
};

// clip inspector

ui.clipInspector.delete.onclick = function() {
  clipSelected.remove();
};

// track inspector

ui.trackInspector.lock.onclick = function() {
  this.toggleAttribute("checked");

  if (this.getAttribute("checked") != null) {
    currentTrack.lock();
  } else {
    currentTrack.unlock();
  }
};

ui.trackInspector.delete.onclick = function() {
  currentTrack.remove();
};
