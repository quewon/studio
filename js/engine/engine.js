function init() {
  conversation = new Conversation();
  new Track();

  initSettings({
    minClipWidth: 10,
    startRecordOnInput: false,
    assembleHangul: true,
    useBakedStates: true,
    printConversation: true,
    monospacedOutput: false
  });

  tick();
}

// settings

var settings = {};

function initSettings(settingData) {
  for (let setting in settingData) {
    var button = document.querySelector("#global-settings button[name='"+setting+"']");
    if (button) {
      if (settingData[setting]) {
        button.setAttribute("checked", true);
      } else {
        button.removeAttribute("checked");
      }
      if (button.onclick == null) {
        button.onclick = function() {
          toggleSetting(setting, this);
        };
      }
    }
    changeSetting(setting, settingData[setting]);
  }
}

function toggleSetting(settingName, button) {
  button.toggleAttribute("checked");
  changeSetting(settingName, button.getAttribute("checked") != null);
}

function changeSetting(settingName, value) {
  settings[settingName] = value;

  switch (settingName) {
    case "printConversation":
      if (settings.printConversation) {
        conversation.domElement.classList.remove("gone");
        conversation.clear();
      } else {
        conversation.domElement.classList.add("gone");
      }
      break;

    case "monospacedOutput":
      if (settings.monospacedOutput) {
        document.body.classList.add("terminal");
      } else {
        document.body.classList.remove("terminal");
      }
      break;
  }

  updateOutput();
}

//

var trackRatio = 1;
var totalTime = 0;
var playheadTime = 0;
var playing = false;

var allTracks = [];
var currentTrack;
var conversation;

var clipDragging;
var clipSelected;
var handleDragging;

var eventBeingEdited;

function handleEvent(e) {
  currentTrack.handleEvent(e);
}

var keydownEvents = [];

document.addEventListener("keydown", function(e) {
  var preventAction = listeningForEditor || focusedOnInput || currentTrack.recording;
  var deleteKey = e.key == "Backspace" || e.key == "Delete";

  if (deleteKey && !preventAction) {
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
    eventBeingEdited.setKey(e);
  }

  if (currentTrack.recording) {
    e.preventDefault();
  }

  if (
    !playing &&
    !preventAction &&
    settings.startRecordOnInput &&
    !deleteKey
  ) {
    currentTrack.toggleRecording(e);
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

//

var lastTick = Date.now();

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
}

//

function updateOutput() {
  for (let track of allTracks) {
    if (!track.muted) track.simulator.printStateAtTimestamp(track.inputEvents, playheadTime);
  }

  if (settings.printConversation) {
    var states = [];
    for (let track of allTracks) {
      if (!track.muted) states.push(track.simulator.lastPrintedState);
    }
    conversation.print(states);
  }
}

function updateTimelineInfo() {
  const fTT = getFormattedTime(totalTime);
  const fPT = getFormattedTime(playheadTime);
  ui.timelineInfo.textContent = "TRACK LENGTH: "+Math.ceil(totalTime)+" | PLAYHEAD: "+Math.ceil(playheadTime)+" | "+fPT+" / "+fTT;
}

function setPlayheadTime(value) {
  const prevValue = playheadTime;
  playheadTime = value;

  updateOutput();

  if (totalTime == 0) {
    ui.trackInspector.playhead.value = 0;
    playheadTime = 0;
    ui.playhead.style.left = "0";
  } else {
    ui.trackInspector.playhead.value = playheadTime;
    ui.playhead.style.left = (playheadTime / trackRatio)+"%";
  }

  updateTimelineInfo();
}

function setTotalTime(value) {
  if (totalTime != value) {
    totalTime = value;
    trackRatio = totalTime / 100;
    updateTimelineInfo();

    if (trackRatio == 0) {
      ui.timelineRuler.style.backgroundSize = "100% 100%";
    } else {
      var ratio = 1000 / trackRatio;
      while (ratio < 1) {
        ratio *= 10;
      }
      ui.timelineRuler.style.backgroundSize = ratio+"% 100%";
    }

    for (let track of allTracks) {
      for (let clip of track.clips) {
        if (clip == this) continue;
        clip.updateTimelineElement();
      }
    }
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
  ui.playButton.textContent = "stop";
  ui.playButton.setAttribute("checked", true);
}

function stopPlaying() {
  playing = false;
  document.body.classList.remove("playing");
  ui.playButton.textContent = "play";
  ui.playButton.removeAttribute("checked");
}

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

var joiningClips = false;
function prepareJoin(button) {
  button.toggleAttribute("checked");
  if (button.getAttribute("checked") != null) {
    startJoinMode();
  } else {
    stopJoinMode();
  }
}

function startJoinMode() {
  joiningClips = true;
  document.body.classList.add("joining");
}

function stopJoinMode() {
  joiningClips = false;
  document.body.classList.remove("joining");
  ui.clipInspector.join.removeAttribute("checked");
}

//

init();
