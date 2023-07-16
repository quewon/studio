class Track {
  constructor() {
    this.clips = [];
    this.orderedEventLog = [];
    this.recording = false;
    this.totalTime = 0;
    this.simulator = new InputSimulator();

    this.domElement = createElement("div", { parent: ui.timeline, className: "track" });

    if (currentTrack) {
      if (currentTrack.recording) {
        currentTrack.stopRecording();
        startPlaying();
      }
    }

    allTracks.push(this);
    currentTrack = this;

    // updateTimeline();
  }

  handleEvent(e) {
    if (this.recording) {
      const currentClip = this.clips[this.clips.length - 1];
      currentClip.recordEvent(e);
    }

    // if (!playing) {
    //   const div = createElement("div", { parent: ui.eventLog, textContent: e.type, className: this.recording ? "recorded" : null });
    //   ui.eventLog.scrollTop = ui.eventLog.scrollHeight;
    // }
  }

  toggleRecording(e) {
    if (this.recording) {
      this.stopRecording();
    } else {
      if (this.playing) {
        this.stopPlaying();
      }
      this.startRecording(e.timeStamp);
    }
  }

  startRecording(startTime) {
    if (playing) {
      stopPlaying();
    }

    this.clips.push(new Clip(this, playheadTime));
    this.recording = true;
    this.recordStartTime = startTime;

    document.body.classList.add("recording");
  }

  stopRecording() {
    const currentClip = this.clips[this.clips.length - 1];
    currentClip.updateTimelineElement();
    this.recording = false;

    document.body.classList.remove("recording");

    this.orderEventLog();
    this.updateTotalTime(true);
  }

  updateTotalTime(updatePlayhead) {
    this.setTotalTime(this.orderedEventLog.length > 0 ? this.orderedEventLog[this.orderedEventLog.length - 1].globalTime : 0);
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
        this.orderedEventLog.push({
          event: e,
          globalTime: e.localTimeStamp + c.startTime
        });
      }
    }

    this.orderedEventLog.sort((a, b) => a.globalTime - b.globalTime);
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

    this.trimStart = 0;
    this.trimmedTime = 0;

    this.position = 0;
    this.width = 0;
  }

  drag(e) {
    this.dragInitials = {
      startTime: this.startTime,
      mousePosition: e.pageX
    };

    document.body.classList.add("dragging");

    clipDragging = this;
  }

  move(mousePosition) {
    // how long is 1px?
    const pixel = totalTime / timelineRulerRect.width;
    // mouse distance traveled in pixels
    const distance = mousePosition - this.dragInitials.mousePosition;

    const dx = Math.ceil(distance * pixel);

    this.startTime = this.dragInitials.startTime + dx;

    this.track.orderEventLog();
    this.track.updateTotalTime();

    this.updateTimelineElement();
  }

  drop() {
    clipDragging = null;
    document.body.classList.remove("dragging");
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
    }
  }

  recordEvent(e) {
    var localTimeStamp = e.timeStamp - this.track.recordStartTime;

    this.log.push(new RecordedEvent(e, {
      localTimeStamp: localTimeStamp,
      parentNode: this.domElement
    }));

    if (this.log.length == 1) {
      this.trimStart = this.log[0].localTimeStamp;
    }

    this.totalTime = localTimeStamp;
    this.trimmedTime = this.totalTime - this.trimStart;
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
    }
  }
}
