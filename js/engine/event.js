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

    if (settings.printConversation) conversation.clear();
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
    this.clip.track.orderInputEvents();
    if (settings.printConversation) conversation.clear();
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

    this.clip.track.orderInputEvents();

    if (settings.printConversation) conversation.clear();
    updateOutput();
  }
}
