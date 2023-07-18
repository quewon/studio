class Track {
  constructor() {
    this.clips = [];
    this.inputEvents = [];
    this.recording = false;
    this.totalTime = 0;
    this.simulator = new Simulator();

    this.domElement = createElement("div", { parent: ui.timeline, className: "track" });
    this.selectorElement = createElement("div", { parent: this.domElement, className: "track-selector" });
    this.domElement.onclick = this.select.bind(this);
    this.domElement.onmouseenter = function(e) {
      if (clipDragging && clipDragging.track != this) {
        clipDragging.addToTrack(this);
      }
    }.bind(this);

    if (currentTrack) {
      if (currentTrack.recording) {
        currentTrack.stopRecording();
        startPlaying();
      }
    }

    this.selected = false;
    this.locked = false;

    this.index = allTracks.length;

    allTracks.push(this);
    this.select();
  }

  lock() {
    this.locked = true;
    ui.trackInspector.lock.setAttribute("checked", true);
    document.body.classList.add("locked");
    this.domElement.classList.add("locked");
    ui.recordButton.setAttribute("disabled", true);
    ui.trackInspector.delete.setAttribute("disabled", true);
    this.refreshLog();
  }

  unlock() {
    this.locked = false;
    ui.trackInspector.lock.removeAttribute("checked");
    document.body.classList.remove("locked");
    this.domElement.classList.remove("locked");
    ui.recordButton.removeAttribute("disabled");
    if (allTracks.length > 1) ui.trackInspector.delete.removeAttribute("disabled");
    this.refreshLog();
  }

  deselect() {
    this.selected = false;
    currentTrack = null;
    this.domElement.classList.remove("selected");
    if (clipSelected && clipSelected.track == this) {
      clipSelected.deselect();
    }
  }

  select() {
    if (clipSelected) {
      clipSelected.deselect();
    }

    this.selected = true;
    if (currentTrack && currentTrack != this) currentTrack.deselect();
    currentTrack = this;
    this.domElement.classList.add("selected");
    setInspectorMode("track");
    this.refreshLog();

    if (allTracks.length == 1) {
      ui.trackInspector.delete.setAttribute("disabled", true);
    } else {
      ui.trackInspector.delete.removeAttribute("disabled");
    }

    if (this.locked) {
      this.lock();
    } else {
      this.unlock();
    }
  }

  refreshLog() {
    if (!this.selected) return;

    while (ui.componentLog.lastChild) {
      ui.componentLog.lastChild.remove();
    }

    createElement("div", { parent: ui.componentLog, textContent: "CLIP LOG ("+this.clips.length+")" });

    for (let c of this.clips) {
      ui.componentLog.appendChild(c.logElement);
      if (this.locked) {
        c.logElement.setAttribute("disabled", true);
      } else {
        c.logElement.removeAttribute("disabled");
      }
    }
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
    if (this.locked) return;

    if (joiningClips) stopJoinMode();

    if (playing) {
      stopPlaying();
    }

    new Clip(this);
    this.recording = true;

    document.body.classList.add("recording");
    this.simulator.domElement.classList.add("recording");
  }

  stopRecording() {
    const currentClip = this.clips[this.clips.length - 1];

    if (currentClip.log.length == 0) {
      currentClip.remove();
      this.refreshLog();
    } else {
      currentClip.updateTimelineElement();
      this.orderInputEvents();
      this.updateTotalTime();
      currentClip.updateLogElement();
      currentClip.select();
    }

    this.recording = false;

    document.body.classList.remove("recording");
    this.simulator.domElement.classList.remove("recording");
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
    }
  }

  orderInputEvents() {
    this.inputEvents = [];

    for (let c of this.clips) {
      for (let e of c.log) {
        if (e.localTimeStamp < c.trimStart) continue;
        if (e.localTimeStamp > c.trimStart + c.trimmedTime) continue;

        this.inputEvents.push(new InputEvent(e.strippedEvent, null, e.localTimeStamp + c.startTime));
      }
    }

    this.inputEvents.sort((a, b) => a.timeStamp - b.timeStamp);
  }

  remove() {
    if (this.locked) return;

    if (currentTrack == this) {
      if (this.index + 1 < allTracks.length) {
        allTracks[this.index + 1].select();
      } else {
        allTracks[this.index - 1].select();
      }
    }

    this.domElement.remove();
    this.selectorElement.remove();
    this.simulator.remove();

    allTracks.splice(this.index, 1);
    for (let i=this.index; i<allTracks.length; i++) {
      allTracks[i].index = i;
    }

    if (allTracks.length == 1) {
      ui.trackInspector.delete.setAttribute("disabled", true);
    } else {
      ui.trackInspector.delete.removeAttribute("disabled");
    }

    conversation.clear();
    updateOutput();
  }
}

class ClipResizeHandles {
  constructor(clip) {
    this.clip = clip;

    this.startHandle = createElement("div", { parent: clip.domElement, className: "resize-handle" });
    this.startHandle.addEventListener("mousedown", this.dragStartHandle.bind(this));

    this.endHandle = createElement("div", { parent: clip.domElement, className: "resize-handle" });
    this.endHandle.addEventListener("mousedown", this.dragEndHandle.bind(this));
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
        this.clip.setTrimStart(this.dragInitials.trimStart + dx);
        break;

      case this.endHandle:
        this.clip.setTrimmedTime(this.dragInitials.trimmedTime + dx);
        break;
    }
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
    this.log = [];

    // init dom elements

    this.domElement = createElement("div", { className: "clip" });
    this.domElement.addEventListener("mousedown", this.drag.bind(this));
    this.domElement.onclick = function(e) {
      e.stopPropagation();
      if (joiningClips && clipSelected != this) clipSelected.join(this);
    }.bind(this);
    this.resizeHandles = new ClipResizeHandles(this);
    this.logElement = createElement("button", { textContent: "clip in progress..." });
    this.logElement.onclick = function() {
      this.select();
    }.bind(this);

    this.clickStart = false;

    this.startTime = 0;
    this.totalTime = 0;
    this.updateTimelineElement();

    this.trimStart = 0;
    this.trimmedTime = 0;

    this.position = 0;
    this.width = 0;

    this.addToTrack(track);
  }

  removeFromTrack() {
    if (clipSelected == this) this.deselect();
    for (let i=this.index + 1; i<this.track.clips.length; i++) {
      this.track.clips[i].index--;
    }
    this.track.clips.splice(this.index, 1);

    this.track.orderInputEvents();
    this.track.updateTotalTime();
    this.track.refreshLog();

    this.domElement.remove();
    this.track = null;

    conversation.clear();
  }

  addToTrack(track) {
    if (track.locked) return;

    if (this.track) {
      const prevPlayhead = playheadTime;
      this.removeFromTrack();
      setPlayheadTime(prevPlayhead);
    }

    this.track = track;
    this.index = track.clips.length;
    track.clips.push(this);

    this.track.domElement.appendChild(this.domElement);
    track.orderInputEvents();
    track.updateTotalTime();
    track.refreshLog();

    conversation.clear();
  }

  updateLogElement() {
    const inputEvents = [];
    for (let e of this.log) {
      if (e.localTimeStamp < this.trimStart || e.localTimeStamp > this.trimStart + this.trimmedTime) continue;

      inputEvents.push(new InputEvent(e.strippedEvent, null, e.localTimeStamp));
    }

    const originalSetting = settings.clearWithEnter;
    settings.clearWithEnter = false;

    var text = this.track.simulator.getStateAtTimeStamp(inputEvents, this.totalTime).textContent;
    if (text[text.length - 1] == "\n" && text[text.length - 2] == "\r") {
      text = text.substring(0, text.length - 2);
    }
    this.logElement.textContent = text + " ("+this.log.length+")";

    settings.clearWithEnter = originalSetting;
  }

  reorderLog() {
    this.updateLogElement();

    this.log.sort((a, b) => a.localTimeStamp - b.localTimeStamp);

    for (let i=0; i<this.log.length; i++) {
      this.log[i].index = i;
    }

    this.refreshLog();
  }

  refreshLog() {
    if (!this.selected) return;

    while (ui.componentLog.lastChild) {
      ui.componentLog.lastChild.remove();
    }

    createElement("div", { parent: ui.componentLog, textContent: "EVENT LOG ("+this.log.length+")" });

    for (let e of this.log) {
      if (e.localTimeStamp < this.trimStart || e.localTimeStamp > this.trimStart + this.trimmedTime) {
        e.logElement.classList.add("trimmed");
      } else {
        e.logElement.classList.remove("trimmed");
      }
      ui.componentLog.appendChild(e.logElement);
    }
  }

  deselect() {
    this.track.refreshLog();

    clipSelected = null;
    this.domElement.classList.remove("selected");
    this.selected = false;
    if (eventBeingEdited) eventBeingEdited.deselect();
    setInspectorMode("track");

    if (joiningClips) stopJoinMode();
  }

  select() {
    if (joiningClips) return;

    if (clipSelected) {
      clipSelected.deselect();
    }

    clipSelected = this;
    this.domElement.classList.add("selected");
    this.selected = true;

    setInspectorMode("clip");

    updateClipInspector();

    this.refreshLog();
  }

  drag(e) {
    e.stopPropagation();

    if (joiningClips && clipSelected != this) return;

    this.clickStart = true;
    this.dragInitials = {
      startTime: this.startTime,
      mousePosition: e.pageX
    };

    document.body.classList.add("dragging");
    this.domElement.classList.add("dragging");
    clipDragging = this;

    this.track.domElement.appendChild(this.domElement);
  }

  setStartTime(value) {
    this.startTime = value;
    this.track.orderInputEvents();
    this.track.updateTotalTime();
    this.updateTimelineElement();

    if (this == clipSelected) {
      updateClipInspector();
    }
  }

  setTrimStart(value) {
    this.trimStart = clamp(value, 0, this.totalTime - settings.minClipWidth);
    this.trimmedTime = this.totalTime - this.trimStart;

    this.track.orderInputEvents();
    this.track.updateTotalTime();
    this.updateTimelineElement();
    this.refreshLog();
    this.updateLogElement();

    if (this == clipSelected) {
      updateClipInspector();
    }
  }

  setTrimmedTime(value) {
    this.trimmedTime = clamp(value, settings.minClipWidth, this.totalTime);

    this.track.orderInputEvents();
    this.track.updateTotalTime();
    this.updateTimelineElement();
    this.refreshLog();
    this.updateLogElement();

    if (this == clipSelected) {
      updateClipInspector();
    }
  }

  move(mousePosition) {
    // how long is 1px?
    var pixel = totalTime / timelineRulerRect.width;
    // mouse distance traveled in pixels
    var distance = mousePosition - this.dragInitials.mousePosition;

    var dx = Math.ceil(distance * pixel);

    if (this.clickStart && Math.abs(distance) > 1) {
      this.clickStart = false;
      if (joiningClips && clipSelected == this) {
        stopJoinMode();
      }
    }

    this.setStartTime(this.dragInitials.startTime + dx);

    conversation.clear();
    updateOutput();

    this.previousMousePosition = mousePosition;
  }

  drop() {
    conversation.clear();
    updateOutput();

    clipDragging = null;
    document.body.classList.remove("dragging");
    this.domElement.classList.remove("dragging");
    if (this.clickStart) this.select();
  }

  duplicate() {
    const copy = new Clip(currentTrack);

    for (let e of this.log) {
      new RecordedEvent(e.strippedEvent, copy, e.localTimeStamp);
    }

    copy.setStartTime(playheadTime - this.trimStart);
    copy.totalTime = this.totalTime;
    copy.setTrimStart(this.trimStart);
    copy.setTrimmedTime(this.trimmedTime);

    copy.logElement.textContent = this.logElement.textContent;
    copy.select();

    setPlayheadTime(copy.startTime + copy.trimStart + copy.trimmedTime);

    return copy;
  }

  split(timeStamp) {
    if (timeStamp < this.startTime + this.trimStart || timeStamp >= this.startTime + this.trimStart + this.trimmedTime) {
      return;
    }

    var copy = this.duplicate();

    copy.addToTrack(this.track);

    const relativeTimeStamp = timeStamp - this.startTime + .1;
    const trimmedTime = this.startTime + this.trimStart + this.trimmedTime - timeStamp;

    this.setTrimmedTime(timeStamp - this.trimStart - this.startTime);

    copy.setStartTime(this.startTime);
    copy.setTrimStart(relativeTimeStamp);
    copy.setTrimmedTime(trimmedTime);

    copy.select();

    setPlayheadTime(timeStamp);
  }

  trim() {
    const start = this.startTime;

    for (let i=this.log.length-1; i>=0; i--) {
      const e = this.log[i];
      if (e.localTimeStamp < this.trimStart || e.localTimeStamp > this.trimStart + this.trimmedTime) {
        e.remove();
      }
    }

    this.totalTime = this.trimmedTime;
    this.setStartTime(this.startTime + this.trimStart);
    this.setTrimStart(0);
    this.setTrimmedTime(this.totalTime);

    for (let e of this.log) {
      const timeStampStamp = e.localTimeStamp + start;
      e.localTimeStamp = timeStampStamp - this.startTime;
    }
  }

  join(clip) {
    this.trim();
    clip.trim();

    // global points
    const startA = this.startTime;
    const startB = clip.startTime;
    const endA = startA + this.totalTime;
    const endB = startB + clip.totalTime;
    const tsA = startA + this.trimStart;
    const tsB = startB + clip.trimStart;
    const teA = tsA + this.trimmedTime;
    const teB = tsB + clip.trimmedTime;

    const start = Math.min(startA, startB);
    const totalTime = Math.max(endA, endB) - start;
    const trimStart = Math.min(tsA, tsB) - start;
    const trimmedTime = Math.max(teA, teB) - start - trimStart;

    this.startTime = start;
    this.totalTime = totalTime;
    this.trimStart = trimStart;
    this.setTrimmedTime(trimmedTime);

    for (let e of this.log) {
      var timeStampStamp = e.localTimeStamp + startA;
      e.localTimeStamp = timeStampStamp - start;
    }

    for (let e of clip.log) {
      e.addToClip(this);

      var timeStampStamp = e.localTimeStamp + clip.startTime;
      e.localTimeStamp = timeStampStamp - start;
    }

    this.reorderLog();
    this.updateTimelineElement();
    this.updateLength();

    if (this.track != clip.track) {
      this.track.orderInputEvents();
    }

    clip.remove();
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
        ui.eventInspector.global.value = this.startTime + e.localTimeStamp;
      }
    }
  }

  recordEvent(e, startTime) {
    if (this.log.length == 0) {
      this.startTime = playheadTime;
      this.recordStartTime = e.timeStamp;
    }

    var localTimeStamp = e.timeStamp - this.recordStartTime;

    new RecordedEvent(e, this, localTimeStamp);

    this.totalTime = localTimeStamp;
    this.trimmedTime = this.totalTime - this.trimStart;

    this.track.orderInputEvents();
  }

  remove() {
    this.removeFromTrack();
    this.domElement.remove();
    this.resizeHandles.remove();
  }
}

class RecordedEvent {
  constructor(e, clip, localTimeStamp) {
    this.strippedEvent = new StrippedEvent(e);
    this.localTimeStamp = localTimeStamp;

    this.domElement = createElement("div", { className: e.type+" timeline-event" });

    this.logElement = createElement("button");
    this.logElement.onclick = function(e) {
      this.logElement.toggleAttribute("checked");
      if (this.logElement.getAttribute("checked") != null) {
        this.select();
      } else {
        this.deselect();
      }
    }.bind(this);
    this.updateLogElement();

    this.addToClip(clip);
  }

  addToClip(clip) {
    // should get removed from previous clip if it has been assigned one, but i don't need that to happen yet

    this.clip = clip;
    this.index = clip.log.length;
    clip.log.push(this);

    clip.domElement.appendChild(this.domElement);
  }

  updateLogElement() {
    this.logElement.innerHTML = this.strippedEvent.type+" "+this.strippedEvent.code+" <em>"+this.strippedEvent.key+"</em>";
  }

  setLocalTimeStamp(value) {
    this.localTimeStamp = Math.max(value, 0);

    this.updateLogElement();
    this.clip.reorderLog();
    this.clip.updateTimelineElement();
    this.clip.updateLength();
    this.clip.track.orderInputEvents();
    this.clip.track.updateTotalTime();

    if (this == eventBeingEdited) {
      ui.eventInspector.global.value = this.clip.startTime + this.localTimeStamp;
      ui.eventInspector.local.value = this.localTimeStamp;
    }

    updateOutput();
  }

  remove() {
    var clipHasNextEvent = false;
    for (let i=this.index + 1; i<this.clip.log.length; i++) {
      clipHasNextEvent = true;
      this.clip.log[i].index--;
    }
    this.clip.log.splice(this.index, 1);

    this.domElement.remove();
    this.logElement.remove();

    if (eventBeingEdited == this) {
      eventBeingEdited.deselect();
    }

    if (this.clip.log.length > 0) {
      var e;
      if (clipHasNextEvent) {
        e = this.clip.log[this.index];
      } else {
        e = this.clip.log[this.index - 1];
      }
      e.logElement.setAttribute("checked", true);
      e.select();

      this.clip.track.orderInputEvents();
      this.clip.refreshLog();
      this.clip.updateLogElement();
      updateOutput();
    } else {
      this.clip.remove();
    }
  }

  select() {
    if (joiningClips) stopJoinMode();

    if (eventBeingEdited && eventBeingEdited != this) {
      eventBeingEdited.deselect();
    }
    eventBeingEdited = this;
    setInspectorMode("event");

    const inspector = ui.eventInspector;

    inspector.keyup.removeAttribute("checked");
    inspector.keydown.removeAttribute("checked");
    inspector[this.strippedEvent.type].setAttribute("checked", true);

    inspector.code.textContent = this.strippedEvent.code;
    inspector.key.textContent = this.strippedEvent.key;
    inspector.listening.classList.add("gone");

    inspector.local.value = this.localTimeStamp;
    inspector.global.value = this.clip.startTime + this.localTimeStamp;
  }

  deselect() {
    stopListening();
    this.logElement.removeAttribute("checked");
    setInspectorMode("clip");
    eventBeingEdited = null;
  }

  setEventType(type) {
    this.strippedEvent.type = type;
    this.updateLogElement();
    updateOutput();

    if (this == eventBeingEdited) {
      ui.eventInspector.keydown.removeAttribute("checked");
      ui.eventInspector.keyup.removeAttribute("checked");
      ui.eventInspector[type].setAttribute("checked", true);
    }
  }

  setKey(e) {
    this.strippedEvent.code = e.code;
    this.strippedEvent.key = e.key;
    this.updateLogElement();

    if (this == eventBeingEdited) {
      ui.eventInspector.key.textContent = this.strippedEvent.key;
      ui.eventInspector.code.textContent = this.strippedEvent.code;
    }

    updateOutput();
  }
}
