class Track {
  constructor() {
    this.clips = [];

    this.recording = false;

    this.totalTime = 0;

    this.domElement = createElement("div", { parent: ui.timeline, className: "track" });
    this.outputElement = createElement("div", { parent: document.body, className: "output" });
    this.caretElement = createElement("div", { parent: this.outputElement, className: "caret" });

    if (currentTrack) {
      if (currentTrack.recording) {
        currentTrack.stopRecording();
        startPlaying();
      }
    }

    allTracks.push(this);
    currentTrack = this;

    updateTimeline();
  }

  handleEvent(e) {
    if (this.recording) {
      this.currentClip.recordEvent(e, playheadTime);
    }

    if (!playing && e.type != "mousemove") {
      const div = createElement("div", { parent: ui.eventLog, textContent: e.type, className: this.recording ? "recorded" : null });
      ui.eventLog.scrollTop = ui.eventLog.scrollHeight;
    }
  }

  toggleRecording() {
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

    this.currentClip = new Clip(this, playheadTime);
    this.recording = true;

    document.body.classList.add("recording");
    ui.input.focus();
  }

  stopRecording() {
    this.currentClip.updateTimelineElement();
    this.clips.push(this.currentClip);
    this.currentClip = null;
    this.recording = false;

    document.body.classList.remove("recording");

    this.updateTotalTime();
  }

  updateTotalTime() {
    var maxClipEnd = 0;
    for (let clip of this.clips) {
      const end = clip.trimStart + clip.trimmedTime;
      if (end > maxClipEnd) {
        maxClipEnd = end;
      }
    }
    this.setTotalTime(maxClipEnd);
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
  }

  update(delta) {
    if (this.recording) {
      this.setTotalTime(Math.max(playheadTime + delta, this.totalTime));
      setPlayheadTime(playheadTime + delta);

      this.printState(new RecordedEvent("fake", { localTimeStamp: 0 }));
    }
  }

  printState(e) {
    if (this.previousPrintedEvent != e) {
      this.outputElement.innerHTML = e.inputFieldContent;

      var start = e.selectionStart;
      var end = e.selectionEnd;
      if (start == end && end <= this.outputElement.textContent.length - 1) {
        end++;
      }

      var range = document.createRange();
      range.setStart(this.outputElement.firstChild || this.outputElement, start);
      range.setEnd(this.outputElement.firstChild || this.outputElement, end);

      while (this.caretElement.lastChild) {
        this.caretElement.lastChild.remove();
      }
      this.caretElement.appendChild(range.extractContents());

      range.insertNode(this.caretElement);

      this.previousPrintedEvent = e;
    }
  }

  clearState() {
    this.outputElement.innerHTML = "";
  }

  getEventsBetweenLocations(timeA, timeB) {
    let events = [];

    for (let c of this.clips) {
      for (let e of c.log) {
        const globalTime = e.localTimeStamp + c.startTime;
        if (globalTime >= timeA && globalTime < timeB) {
          events.push(e);
        }
      }
    }

    return events;
  }

  getEventAtLocation(time) {
    if (this.clips.length == 0) return null;

    let clip;
    let e;

    clip = this.clips[0];
    for (let c of this.clips) {
      if (
        time >= c.trimStart &&
        time < c.trimStart + c.trimmedTime
      ) {
        clip = c;
        break;
      }
    }

    let localTime = time - clip.trimStart;

    for (let i=0; i<clip.log.length; i++) {
      const current = clip.log[i];
      if (localTime >= current.localTimeStamp) {
        e = current;
      }
    }

    return e;
  }
}

class Clip {
  constructor(track, time) {
    this.track = track;
    this.log = [];

    this.domElement = createElement("div", { parent: this.track.domElement, className: "clip" });
    this.domElement.addEventListener("mousedown", this.drag.bind(this));

    this.startTime = time || 0;
    this.totalTime = 0;
    this.updateTimelineElement();

    this.trimStart = this.startTime;
    this.trimmedTime = 0;

    this.position = 0;
    this.width = 0;
  }

  drag(e) {
    this.dragInitials = {
      startTime: this.startTime,
      trimStart: this.trimStart,
      mousePosition: e.pageX
    };

    document.body.classList.add("dragging");

    clipDragging = this;
  }

  move(mousePosition) {
    // how long is 1px?
    const pixel = totalTime / document.body.offsetWidth;
    // mouse distance traveled in pixels
    const distance = mousePosition - this.dragInitials.mousePosition;

    const dx = Math.ceil(distance * pixel);

    this.startTime = this.dragInitials.startTime + dx;
    this.trimStart = this.dragInitials.trimStart + dx;

    this.track.updateTotalTime();

    this.updateTimelineElement();
  }

  drop() {
    clipDragging = null;
    document.body.classList.remove("dragging");
  }

  updateTimelineElement() {
    const width = this.trimmedTime / trackRatio;
    const position = this.trimStart / trackRatio;

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
    const clipRatio = this.totalTime / 100;

    for (let e of this.log) {
      e.domElement.style.left = (e.localTimeStamp / clipRatio)+"%";
    }
  }

  recordEvent(e, timeStamp) {
    this.log.push(new RecordedEvent(e, {
      localTimeStamp: timeStamp - this.startTime,
      parentNode: this.domElement
    }));

    if (this.log.length == 1) {
      this.trimStart = this.startTime + this.log[0].localTimeStamp;
    }

    this.totalTime = timeStamp - this.startTime;
    this.trimmedTime = this.totalTime - this.trimStart;
  }
}

class RecordedEvent {
  constructor(e, props) {
    this.type = e.type;
    this.code = e.code;

    if ('localTimeStamp' in props) {
      this.localTimeStamp = props.localTimeStamp;
      this.inputFieldContent = ui.input.innerHTML;

      var selection = document.getSelection();
      if (selection.anchorNode && (selection.anchorNode == ui.input || selection.anchorNode.parentNode == ui.input)) {
        this.selectionStart = selection.anchorOffset <= selection.focusOffset ? selection.anchorOffset : selection.focusOffset;
        this.selectionEnd = selection.focusOffset >= selection.anchorOffset ? selection.focusOffset : selection.anchorOffset;
      } else {
        this.selectionStart = this.selectionEnd = ui.input.textContent.length;
      }
    }

    if (props.isCopy) {
      this.localTimeStamp = e.localTimeStamp;
      this.inputFieldContent = e.inputFieldContent;
      this.selectionStart = e.selectionStart;
      this.selectionEnd = e.selectionEnd;
    }

    if (props.parentNode) {
      this.domElement = createElement("div", { parent: props.parentNode, className: e.type+" timeline-event" });
    }
  }
}
