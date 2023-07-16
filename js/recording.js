class Track {
  constructor() {
    this.clips = [];
    this.orderedEventLog = [];
    this.recording = false;
    this.totalTime = 0;
    this.simulator = new InputSimulator();

    this.domElement = createElement("div", { parent: ui.timeline, className: "track" });
    this.selectorElement = createElement("div", { parent: this.domElement, className: "track-selector" });
    this.domElement.onclick = this.select.bind(this);

    if (currentTrack) {
      if (currentTrack.recording) {
        currentTrack.stopRecording();
        startPlaying();
      }
    }

    allTracks.push(this);
    this.select();
  }

  deselect() {
    currentTrack = null;
    this.domElement.classList.remove("selected");
    if (clipSelected && clipSelected.track == this) {
      clipSelected.deselect();
    }
  }

  select() {
    if (currentTrack && currentTrack != this) currentTrack.deselect();
    currentTrack = this;
    this.domElement.classList.add("selected");
  }

  handleEvent(e) {
    if (this.recording) {
      const currentClip = this.clips[this.clips.length - 1];
      currentClip.recordEvent(e);
    }
  }

  toggleRecording(e) {
    if (this.recording) {
      this.stopRecording();
    } else {
      if (this.playing) {
        this.stopPlaying();
      }
      this.startRecording();
    }
  }

  startRecording() {
    if (playing) {
      stopPlaying();
    }

    this.clips.push(new Clip(this));
    this.recording = true;

    document.body.classList.add("recording");
    this.simulator.domElement.classList.add("recording");
  }

  stopRecording() {
    const currentClip = this.clips[this.clips.length - 1];

    if (currentClip.log.length == 0) {
      currentClip.remove();
      this.clips.splice(this.clips.length - 1, 1);
    } else {
      currentClip.updateTimelineElement();
      this.orderEventLog();
    }

    this.recording = false;

    document.body.classList.remove("recording");
    this.simulator.domElement.classList.remove("recording");

    this.updateTotalTime();
  }

  updateTotalTime() {
    var maxClipLength = 0;
    for (let c of this.clips) {
      var length = c.startTime + c.trimStart + c.trimmedTime;
      if (length > maxClipLength) {
        maxClipLength = length;
      }
    }

    this.setTotalTime(maxClipLength);
  }

  setTotalTime(time) {
    this.totalTime = time;

    var maxTrackLength = 0;
    for (let track of allTracks) {
      if (track.totalTime > maxTrackLength) {
        maxTrackLength = track.totalTime;
      }
    }

    setTotalTime(maxTrackLength);

    if (playheadTime > maxTrackLength) {
      setPlayheadTime(maxTrackLength);
    } else {
      setPlayheadTime(playheadTime);
    }
  }

  update(delta) {
    if (this.recording) {
      this.setTotalTime(Math.max(playheadTime + delta, this.totalTime));
      setPlayheadTime(playheadTime + delta);

      this.orderEventLog();
    }
  }

  orderEventLog() {
    this.orderedEventLog = [];

    for (let c of this.clips) {
      for (let e of c.log) {
        if (e.localTimeStamp < c.trimStart) continue;
        if (e.localTimeStamp > c.trimStart + c.trimmedTime) continue;

        this.orderedEventLog.push({
          event: e,
          globalTime: e.localTimeStamp + c.startTime
        });
      }
    }

    this.orderedEventLog.sort((a, b) => a.globalTime - b.globalTime);
  }
}

class ClipResizeHandles {
  constructor(clip) {
    this.clip = clip;

    this.startHandle = createElement("div", { parent: clip.domElement, className: "resize-handle" });
    this.startHandle.addEventListener("mousedown", this.dragStartHandle.bind(this));

    this.endHandle = createElement("div", { parent: clip.domElement, className: "resize-handle" });
    this.endHandle.addEventListener("mousedown", this.dragEndHandle.bind(this));

    this.minClipWidth = 10;
  }

  drag(e) {
    e.stopPropagation();

    handleDragging = this;
    this.dragInitials = {
      mousePosition: e.pageX,
      trimStart: this.clip.trimStart,
      trimmedTime: this.clip.trimmedTime
    };
    document.body.classList.add("resizing");
    this.selectedHandle.classList.add("resizing");
  }

  dragStartHandle(e) {
    this.selectedHandle = this.startHandle;
    this.drag(e);
  }

  dragEndHandle(e) {
    this.selectedHandle = this.endHandle;
    this.drag(e);
  }

  move(mousePosition) {
    const pixel = totalTime / timelineRulerRect.width;
    const distance = mousePosition - this.dragInitials.mousePosition;
    const dx = Math.ceil(distance * pixel);

    switch (this.selectedHandle) {
      case this.startHandle:
        this.clip.trimStart = clamp(this.dragInitials.trimStart + dx, 0, this.clip.totalTime - this.minClipWidth);
        this.clip.trimmedTime = this.clip.totalTime - this.clip.trimStart;
        break;

      case this.endHandle:
        this.clip.trimmedTime = clamp(this.dragInitials.trimmedTime + dx, this.minClipWidth, this.clip.totalTime);
        break;
    }

    this.clip.track.orderEventLog();
    this.clip.track.updateTotalTime();
    this.clip.updateTimelineElement();
    this.clip.refreshLog();
  }

  drop() {
    document.body.classList.remove("resizing");
    this.selectedHandle.classList.remove("resizing");
    handleDragging = null;
  }

  remove() {
    this.startHandle.remove();
    this.endHandle.remove();
  }
}

class Clip {
  constructor(track) {
    this.track = track;
    this.log = [];

    // init dom elements

    this.domElement = createElement("div", { parent: this.track.domElement, className: "clip" });
    this.domElement.addEventListener("mousedown", this.drag.bind(this));
    this.resizeHandles = new ClipResizeHandles(this);

    this.clickStart = false;

    this.startTime = 0;
    this.totalTime = 0;
    this.updateTimelineElement();

    this.trimStart = 0;
    this.trimmedTime = 0;

    this.position = 0;
    this.width = 0;
  }

  refreshLog() {
    if (!this.selected) return;

    while (ui.eventLog.lastChild) {
      ui.eventLog.lastChild.remove();
    }

    for (let e of this.log) {
      if (e.localTimeStamp < this.trimStart || e.localTimeStamp > this.trimStart + this.trimmedTime) {
        e.logElement.classList.add("trimmed");
      } else {
        e.logElement.classList.remove("trimmed");
      }
      ui.eventLog.appendChild(e.logElement);
    }
  }

  deselect() {
    clipSelected = null;
    this.domElement.classList.remove("selected");
    this.selected = false;
    ui.eventLog.textContent = "No clip selected.";
    if (eventBeingEdited) stopEditingEvent(eventBeingEdited);
  }

  select() {
    if (clipSelected) {
      clipSelected.deselect();
    }

    clipSelected = this;
    this.domElement.classList.add("selected");
    this.selected = true;

    this.refreshLog();
  }

  drag(e) {
    e.stopPropagation();

    this.dragInitials = {
      startTime: this.startTime,
      mousePosition: e.pageX
    };
    this.clickStart = true;

    document.body.classList.add("dragging");

    clipDragging = this;
  }

  move(mousePosition) {
    // how long is 1px?
    const pixel = totalTime / timelineRulerRect.width;
    // mouse distance traveled in pixels
    const distance = mousePosition - this.dragInitials.mousePosition;

    const dx = Math.ceil(distance * pixel);

    if (this.clickStart && Math.abs(distance) > 1) {
      this.clickStart = false;
    }

    this.startTime = this.dragInitials.startTime + dx;

    this.track.orderEventLog();
    this.track.updateTotalTime();

    this.updateTimelineElement();
  }

  drop() {
    clipDragging = null;
    document.body.classList.remove("dragging");
    if (this.clickStart) this.select();
  }

  updateTimelineElement() {
    const width = this.trimmedTime / trackRatio;
    const position = (this.startTime + this.trimStart) / trackRatio;

    if (width != this.width) {
      this.width = width;
      this.domElement.style.width = width+"%";

      this.updateLength();
    }

    if (position != this.position) {
      this.position = position;
      this.domElement.style.left = position+"%";
    }
  }

  updateLength() {
    const clipRatio = this.trimmedTime / 100;

    for (let e of this.log) {
      e.domElement.style.left = ((e.localTimeStamp - this.trimStart) / clipRatio)+"%";

      if (eventBeingEdited == e) {
        ui.editor.global.value = this.startTime + e.localTimeStamp
      }
    }
  }

  recordEvent(e) {
    if (this.log.length == 0) {
      this.startTime = playheadTime;
      this.recordStartTime = e.timeStamp;
    }

    var localTimeStamp = e.timeStamp - this.recordStartTime;

    this.log.push(new RecordedEvent(e, {
      localTimeStamp: localTimeStamp,
      parentNode: this.domElement,
      index: this.log.length,
      clip: this
    }));

    this.totalTime = localTimeStamp;
    this.trimmedTime = this.totalTime - this.trimStart;
  }

  remove() {
    this.domElement.remove();
    this.resizeHandles.remove();
  }
}

class RecordedEvent {
  constructor(e, props) {
    this.type = e.type;
    this.key = e.key;
    this.code = e.code;

    if ('localTimeStamp' in props) {
      this.localTimeStamp = props.localTimeStamp;
    }

    if (props.isCopy) {
      this.localTimeStamp = e.localTimeStamp;
    }

    if (props.parentNode) {
      this.domElement = createElement("div", { parent: props.parentNode, className: e.type+" timeline-event" });

      this.logElement = createElement("button");
      this.logElement.onclick = function(e) {
        this.logElement.toggleAttribute("checked");
        if (this.logElement.getAttribute("checked") != null) {
          startEditingEvent(this);
        } else {
          stopEditingEvent(this);
        }
      }.bind(this);
      this.updateLogElement();

      this.clip = props.clip;
      this.index = props.index;
    }
  }

  updateLogElement() {
    this.logElement.innerHTML = this.type+" "+this.code+" <em>"+this.key+"</em>";
  }

  setLocalTimeStamp(value) {
    this.localTimeStamp = Math.max(value, 0);

    this.updateLogElement();
    this.clip.updateLength();
    this.clip.updateTimelineElement();
    this.clip.track.orderEventLog();
    this.clip.track.updateTotalTime();
  }

  remove() {
    for (let i=this.index + 1; i<this.clip.log.length; i++) {
      this.clip.log[i].index--;
    }
    this.clip.log.splice(this.index, 1);

    this.domElement.remove();
    this.logElement.remove();
  }
}

var eventBeingEdited;
function startEditingEvent(e) {
  if (eventBeingEdited) {
    stopEditingEvent(eventBeingEdited);
  }
  eventBeingEdited = e;
  ui.eventEditor.classList.add("open");

  ui.editor.keyup.removeAttribute("checked");
  ui.editor.keydown.removeAttribute("checked");

  if (e.type == "keydown") {
    ui.editor.keydown.setAttribute("checked", true);
  } else {
    ui.editor.keyup.setAttribute("checked", true);
  }

  ui.editor.code.textContent = e.code;
  ui.editor.key.textContent = e.key;
  ui.editor.listening.classList.add("gone");

  ui.editor.local.value = e.localTimeStamp;
  ui.editor.global.value = e.clip.startTime + e.localTimeStamp;
}

function stopEditingEvent(e) {
  e.logElement.removeAttribute("checked");
  ui.eventEditor.classList.remove("open");
  listeningForEditor = false;
}
