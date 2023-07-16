const ui = {
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
}

var currentTrack;
var allTracks = [];
new Track();

function handleEvent(e) {
  currentTrack.handleEvent(e);
}

var keydownEvents = [];
document.addEventListener("keydown", function(e) {
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
document.addEventListener("mousemove", function(e) {
  if (clipDragging) clipDragging.move(e.pageX);
  if (draggingPlayhead) {
    movePlayhead(e.pageX);
  }
});
document.addEventListener("mousedown", function(e) {

});
document.addEventListener("mouseup", function(e) {
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

function switchToTrack(index) {
  currentTrack = allTracks[index];
}
