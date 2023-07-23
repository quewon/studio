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
    this.muted = false;

    this.index = allTracks.length;

    allTracks.push(this);
    this.select();
  }

  mute() {
    this.muted = true;
    this.domElement.classList.add("mute");
    ui.trackInspector.mute.setAttribute("checked", true);
    ui.trackInspector.mute.textContent = "unmute";
    this.simulator.domElement.remove();

    if (settings.printConversation) conversation.clear();
    updateOutput();
  }

  unmute() {
    this.muted = false;
    this.domElement.classList.remove("mute");
    ui.trackInspector.mute.removeAttribute("checked");
    ui.trackInspector.mute.textContent = "mute";

    for (let track of allTracks) {
      if (track.muted) continue;
      document.body.appendChild(track.simulator.domElement);
    }

    if (settings.printConversation) conversation.clear();
    updateOutput();
  }

  lock() {
    this.locked = true;
    ui.trackInspector.lock.setAttribute("checked", true);
    ui.trackInspector.lock.textContent = "unlock";
    document.body.classList.add("locked");
    this.domElement.classList.add("locked");
    ui.recordButton.setAttribute("disabled", true);
    ui.trackInspector.delete.setAttribute("disabled", true);
    this.refreshLog();
  }

  unlock() {
    this.locked = false;
    ui.trackInspector.lock.removeAttribute("checked");
    ui.trackInspector.lock.textContent = "lock";
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

    if (this.muted) {
      ui.trackInspector.mute.setAttribute("checked", true);
      ui.trackInspector.mute.textContent = "unmute";
    } else {
      ui.trackInspector.mute.removeAttribute("checked");
      ui.trackInspector.mute.textContent = "mute";
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
    ui.recordButton.textContent = "stop recording";
    ui.recordButton.setAttribute("checked", true);
  }

  stopRecording() {
    const currentClip = this.clips[this.clips.length - 1];

    if (currentClip.log.length == 0) {
      currentClip.remove();
      this.refreshLog();
    } else {
      this.orderInputEvents();
      this.updateTotalTime();
      currentClip.updateLogElement();
      currentClip.select();
    }

    this.recording = false;

    document.body.classList.remove("recording");
    this.simulator.domElement.classList.remove("recording");
    ui.recordButton.textContent = "record";
    ui.recordButton.removeAttribute("checked");
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

    if (settings.printConversation) {
      conversation.clear();
      updateOutput();
    }
  }
}
