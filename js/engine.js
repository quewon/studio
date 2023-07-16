const ui = {
  input: document.getElementById("input"),
  timeline: document.getElementById("timeline"),
  timelineInfo: document.getElementById("timeline-info"),
  timelineRuler: document.getElementById("timeline-ruler"),
  playhead: document.getElementById("playhead"),
  eventLog: document.getElementById("event-log"),
};

var trackRatio = 1;
var totalTime = 0;
var playheadTime = 0;
var playing = false;
var clipDragging;

var settings = {
  startRecordOnInput: false,
  clearWithEnter: false
};
function toggleSetting(settingName, button) {
  button.toggleAttribute("checked");
  settings[settingName] = button.getAttribute("checked") != null;
  ui.input.focus();
}

var currentTrack;
var allTracks = [];
new Track();

function handleEvent(e) {
  currentTrack.handleEvent(e);
}

var keydownEvents = [];
ui.input.addEventListener("keydown", function(e) {
  if (!playing) {
    if (!currentTrack.recording && settings.startRecordOnInput) {
      currentTrack.toggleRecording(e);
    }

    if (e.key == "Enter" && settings.clearWithEnter) {
      e.preventDefault();
      ui.input.innerHTML = "";
    }
  }

  handleEvent(e);
  keydownEvents.push(e);
});
ui.input.addEventListener("keyup", function(e) {
  if (e.key == "Meta") {
    for (let i=keydownEvents.length-1; i>=0; i--) {
      if (keydownEvents[i].metaKey && keydownEvents[i].key != "Meta") {
        ui.input.dispatchEvent(new KeyboardEvent("keyup", keydownEvents[i]));
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
document.addEventListener("mousemove", function(e) {
  handleEvent(e);

  if (clipDragging) clipDragging.move(e.pageX);
  if (draggingPlayhead) {
    movePlayhead(e.pageX);
  }
});
document.addEventListener("mousedown", handleEvent);
document.addEventListener("mouseup", function(e) {
  handleEvent(e);

  if (clipDragging) clipDragging.drop();
  if (draggingPlayhead) dropPlayhead();
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
  // inputVisualizer.update(delta);

  if (playing) {
    const previousTime = playheadTime;

    setPlayheadTime(playheadTime + delta);
    if (playheadTime >= totalTime) {
      setPlayheadTime(totalTime);
      stopPlaying();
    }

    for (let track of allTracks) {
      const passedEvents = track.getEventsBetweenLocations(previousTime, playheadTime);
      for (let e of passedEvents) {
        simulateEvent(e);
      }

      if (passedEvents.length > 0) {
        const lastEvent = passedEvents[passedEvents.length - 1];
        track.printState(lastEvent);
      } else {
        track.printState(track.getStateAtLocation(playheadTime));
      }
    }
  }

  if (playing || currentTrack.recording) {
    updateTimeline();
  }
}

function setPlayheadTime(value) {
  const prevValue = playheadTime;
  playheadTime = value;

  if (!playing) {
    for (let track of allTracks) {
      track.printState(track.getStateAtLocation(playheadTime));
    }
  }

  ui.playhead.style.left = (playheadTime / trackRatio)+"%";
  ui.timelineInfo.textContent = "TRACK LENGTH: "+Math.ceil(totalTime)+" | PLAYHEAD: "+Math.ceil(playheadTime);
}

function simulateEvent(e) {
  if (e.type == "keyup" || e.type == "keydown") {
    ui.input.dispatchEvent(new KeyboardEvent(e.type, e));
  }
}

function setTotalTime(value) {
  if (totalTime != value) {
    totalTime = value;
    trackRatio = totalTime / 100;
    ui.timelineInfo.textContent = "TRACK LENGTH: "+Math.ceil(totalTime)+" | PLAYHEAD: "+Math.ceil(playheadTime);
    ui.timelineRuler.style.backgroundSize = (1000 / trackRatio)+"% 100%";

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
  // if (inputVisualizer) inputVisualizer.blur();
}

// moving the playhead

var draggingPlayhead = false;
var timelineRulerRect = ui.timelineRuler.getBoundingClientRect();

ui.timelineRuler.addEventListener("mousedown", function(e) {
  draggingPlayhead = true;
});

document.addEventListener("resize", function() {
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
