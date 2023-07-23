// inspector

var focusedOnInput;
var listeningForEditor;

function setInspectorMode(className) {
  ui.inspector.classList.remove("track");
  ui.inspector.classList.remove("clip");
  ui.inspector.classList.remove("event");
  ui.inspector.classList.add(className);
}

ui.eventInspector.local.onfocus =
ui.eventInspector.global.onfocus =
ui.clipInspector.timestamp.onfocus =
ui.clipInspector.trimStart.onfocus =
ui.clipInspector.trimLength.onfocus =
ui.trackInspector.playhead.onfocus =
function() {
  focusedOnInput = true;
};

ui.eventInspector.local.onblur =
ui.eventInspector.global.onblur =
ui.clipInspector.timestamp.onblur =
ui.clipInspector.trimStart.onblur =
ui.clipInspector.trimLength.onblur =
ui.trackInspector.playhead.onblur =
function() {
  focusedOnInput = false;
};

// event inspector

function stopListening() {
  listeningForEditor = false;
  ui.inspector.classList.remove("listening");
  ui.eventInspector.listen.textContent = "listen";
}

ui.eventInspector.listen.onclick = function() {
  if (listeningForEditor) {
    stopListening();
  } else {
    listeningForEditor = true;
    ui.inspector.classList.add("listening");
    ui.eventInspector.listen.textContent = "stop listening";
  }
};

ui.eventInspector.keydown.onclick = function() {
  eventBeingEdited.setEventType("keydown");
};

ui.eventInspector.keyup.onclick = function() {
  eventBeingEdited.setEventType("keyup");
};

ui.eventInspector.local.onchange = function() {
  if (eventBeingEdited) eventBeingEdited.setLocalTimeStamp(ui.eventInspector.local.value);
};
ui.eventInspector.global.onchange = function() {
  const e = eventBeingEdited;
  if (!e) return;
  const globalTime = e.localTimeStamp + e.clip.startTime;
  const delta = ui.eventInspector.global.value - globalTime;
  e.setLocalTimeStamp(e.localTimeStamp + delta);
};

ui.eventInspector.delete.onclick = function() {
  eventBeingEdited.remove();
};

// clip inspector

function updateClipInspector() {
  const c = clipSelected;

  ui.clipInspector.timestamp.value = c.startTime;
  ui.clipInspector.length.textContent = c.totalTime;
  ui.clipInspector.trimStart.value = c.trimStart;
  ui.clipInspector.trimLength.value = c.trimmedTime;
}

ui.clipInspector.timestamp.onchange = function() {
  const c = clipSelected;
  if (!c) return;
  c.setStartTime(Number(this.value));
};

ui.clipInspector.trimStart.onchange = function() {
  const c = clipSelected;
  if (!c) return;
  c.setTrimStart(Number(this.value));
};

ui.clipInspector.trimLength.onchange = function() {
  const c = clipSelected;
  if (!c) return;
  c.setTrimmedTime(Number(this.value));
};

ui.clipInspector.duplicate.onclick = function() {
  clipSelected.duplicate();
};

ui.clipInspector.delete.onclick = function() {
  clipSelected.remove();
};

// track inspector

ui.trackInspector.playhead.onchange = function() {
  setPlayheadTime(clamp(this.value, 0, totalTime));
};

ui.trackInspector.lock.onclick = function() {
  this.toggleAttribute("checked");

  if (this.getAttribute("checked") != null) {
    currentTrack.lock();
  } else {
    currentTrack.unlock();
  }
};

ui.trackInspector.mute.onclick = function() {
  this.toggleAttribute("checked");

  if (this.getAttribute("checked") != null) {
    currentTrack.mute();
  } else {
    currentTrack.unmute();
  }
};

ui.trackInspector.delete.onclick = function() {
  currentTrack.remove();
};
