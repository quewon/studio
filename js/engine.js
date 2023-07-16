const ui = {
  timeline: document.getElementById("timeline"),
  timelineInfo: document.getElementById("timeline-info"),
  timelineRuler: document.getElementById("timeline-ruler"),
  playhead: document.getElementById("playhead"),
  eventLog: document.getElementById("event-log"),
  eventEditor: document.getElementById("event-editor"),

  editor: {
    keydown: document.querySelector("[name='keydown']"),
    keyup: document.querySelector("[name='keyup']"),
    code: document.querySelector("[name='code']"),
    key: document.querySelector("[name='key']"),
    listen: document.querySelector("[name='listen']"),
    listening: document.querySelector("[name='listening']"),
    local: document.querySelector("[name='local']"),
    global: document.querySelector("[name='global']"),
    delete: document.querySelector("[name='delete']")
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

var settings = {
  startRecordOnInput: false,
  clearWithEnter: false
};
function toggleSetting(settingName, button) {
  button.toggleAttribute("checked");
  settings[settingName] = button.getAttribute("checked") != null;
}

var currentTrack;
var allTracks = [];
new Track();

function handleEvent(e) {
  currentTrack.handleEvent(e);
}

var keydownEvents = [];
document.addEventListener("keydown", function(e) {
  if (listeningForEditor) {
    listeningForEditor = false;
    ui.editor.listening.classList.add("gone");
    eventBeingEdited.code = e.code;
    eventBeingEdited.key = e.key;
    eventBeingEdited.updateLogElement();
    ui.editor.key.textContent = eventBeingEdited.key;
    ui.editor.code.textContent = eventBeingEdited.code;
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

  if (!currentTrack.recording && clipSelected && e.key == "Backspace") {
    clipSelected.remove();
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

function setPlayheadTime(value) {
  const prevValue = playheadTime;
  playheadTime = value;

  for (let track of allTracks) {
    track.simulator.printStateAtTimestamp(track.orderedEventLog, playheadTime);
  }

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

// editor

ui.editor.listen.onclick = function() {
  listeningForEditor = true;
  ui.editor.listening.classList.remove("gone");
};

ui.editor.keydown.onclick = function() {
  ui.editor.keydown.setAttribute("checked", true);
  ui.editor.keyup.removeAttribute("checked");
  eventBeingEdited.type = "keydown";
  eventBeingEdited.updateLogElement();
};

ui.editor.keyup.onclick = function() {
  ui.editor.keyup.setAttribute("checked", true);
  ui.editor.keydown.removeAttribute("checked");
  eventBeingEdited.type = "keyup";
  eventBeingEdited.updateLogElement();
};

ui.editor.local.onchange = function() {
  const e = eventBeingEdited;
  e.setLocalTimeStamp(ui.editor.local.value);
  ui.editor.global.value = e.clip.startTime + e.localTimeStamp;
};
ui.editor.global.onchange = function() {
  const e = eventBeingEdited;

  const globalTime = e.localTimeStamp + e.clip.startTime;
  const delta = ui.editor.global.value - globalTime;
  e.setLocalTimeStamp(e.localTimeStamp + delta);
  ui.editor.local.value = e.localTimeStamp;
};

ui.editor.delete.onclick = function() {
  eventBeingEdited.remove();
  stopEditingEvent(eventBeingEdited);
};
