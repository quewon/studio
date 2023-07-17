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
    ui.trackInspector.delete.removeAttribute("disabled");
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
      this.orderEventLog();
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
    };
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
    this.minClipWidth = 10;

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

    this.track.orderEventLog();
    this.track.updateTotalTime();
    this.track.refreshLog();

    this.domElement.remove();
    this.track = null;
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
    track.orderEventLog();
    track.updateTotalTime();
    track.refreshLog();
  }

  updateLogElement() {
    const events = [];
    for (let e of this.log) {
      events.push({
        globalTime: e.localTimeStamp,
        event: e
      });
    }

    this.logElement.textContent = this.track.simulator.getStateAtTimeStamp(events, this.totalTime).textContent + " ("+this.log.length+")";
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
    if (eventBeingEdited) stopEditingEvent(eventBeingEdited);
    setInspectorMode("track");
  }

  select() {
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

    this.dragInitials = {
      startTime: this.startTime,
      mousePosition: e.pageX
    };
    this.clickStart = true;

    document.body.classList.add("dragging");
    this.domElement.classList.add("dragging");

    clipDragging = this;
  }

  setStartTime(value) {
    this.startTime = value;
    this.track.orderEventLog();
    this.track.updateTotalTime();
    this.updateTimelineElement();

    if (this == clipSelected) {
      updateClipInspector();
    }
  }

  setTrimStart(value) {
    this.trimStart = clamp(value, 0, this.totalTime - this.minClipWidth);
    this.trimmedTime = this.totalTime - this.trimStart;

    this.track.orderEventLog();
    this.track.updateTotalTime();
    this.updateTimelineElement();
    this.refreshLog();

    if (this == clipSelected) {
      updateClipInspector();
    }
  }

  setTrimmedTime(value) {
    this.trimmedTime = clamp(value, this.minClipWidth, this.totalTime);

    this.track.orderEventLog();
    this.track.updateTotalTime();
    this.updateTimelineElement();
    this.refreshLog();

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
    }

    this.setStartTime(this.dragInitials.startTime + dx);
  }

  drop() {
    clipDragging = null;
    document.body.classList.remove("dragging");
    this.domElement.classList.remove("dragging");
    if (this.clickStart) this.select();
  }

  duplicate() {
    const copy = new Clip(this.track);

    for (let e of this.log) {
      const eventCopy = new RecordedEvent(e, { localTimeStamp: e.localTimeStamp, parentNode: copy.domElement, clip: copy, index: e.index });
      copy.log.push(eventCopy);
    }

    copy.setStartTime(playheadTime - this.trimStart);
    copy.totalTime = this.totalTime;
    copy.setTrimStart(this.trimStart);
    copy.setTrimmedTime(this.trimmedTime);
    copy.select();

    setPlayheadTime(copy.startTime + copy.trimStart + copy.trimmedTime);
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
    this.removeFromTrack();
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
    this.clip.reorderLog();
    this.clip.updateTimelineElement();
    this.clip.updateLength();
    this.clip.track.orderEventLog();
    this.clip.track.updateTotalTime();

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
      stopEditingEvent(eventBeingEdited);
    }

    if (this.clip.log.length > 0) {
      var e;
      if (clipHasNextEvent) {
        e = this.clip.log[this.index];
      } else {
        e = this.clip.log[this.index - 1];
      }
      e.logElement.setAttribute("checked", true);
      startEditingEvent(e);

      this.clip.track.orderEventLog();
      this.clip.refreshLog();
      this.clip.updateLogElement();
      updateOutput();
    } else {
      this.clip.remove();
    }
  }
}
