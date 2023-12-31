class StrippedEvent {
  constructor(e) {
    e = e || {};

    this.type = e.type;
    this.key = e.key;
    this.code = e.code;
  }
}

class SimulationState {
  constructor(state) {
    state = state || {};

    this.textContent = state.textContent || "";
    this.selectionStart = state.selectionStart || 0;
    this.selectionEnd = state.selectionEnd || 0;
    this.selectionDirection = state.selectionDirection || 0;
    this.shiftKey = state.shiftKey || false;
    this.metaKey = state.metaKey || false;
    this.capsLock = state.capsLock || false;

    this.clearedText = [];
    if (state.clearedText) {
      for (let text of state.clearedText) {
        this.clearedText.push(text);
      }
    }
  }
}

class InputEvent {
  constructor(e, state, timeStamp) {
    this.strippedEvent = new StrippedEvent(e);
    this.bakedState = state ? new SimulationState(state) : null;
    this.timeStamp = timeStamp || 0;
  }
}

class Simulator {
  constructor() {
    this.domElement = createElement("div", { parent: document.body, className: "output" });
    this.caretElement = createElement("div", { parent: this.domElement, className: "caret" });
    this.lastPrintedState = null;
  }

  simulateEvent(state, inputEvent) {
    const e = inputEvent.strippedEvent;
    const timeStamp = inputEvent.timeStamp;

    var copy = new SimulationState(state);

    const text = state.textContent;
    const start = state.selectionStart;
    const end = state.selectionEnd;

    if (e.type == "keydown") {
      if (e.key == "Backspace") {
        if (start != end) {
          copy.selectionEnd = copy.selectionStart;
          copy.textContent = text.slice(0, start) + text.slice(end);
        } else {
          copy.selectionStart = copy.selectionEnd = Math.max(start-1, 0);
          copy.textContent = text.slice(0, copy.selectionStart) + text.slice(end);
        }
      } else {
        var insert;

        switch (e.key) {
          case "Enter":
            if (settings.printConversation) {
              if (copy.textContent != "") {
                copy.clearedText.push(copy.textContent);
                copy.clearedText.push(timeStamp);
                copy.textContent = "";
                copy.selectionStart = copy.selectionEnd = 0;
              }
            } else {
              insert = "\r\n";
            }
            break;

          case "Shift":
            copy.shiftKey = true;
            break;

          case "Meta":
          case "Control":
            copy.metaKey = true;
            break;

          case "CapsLock":
            copy.capsLock = true;
            break;

          case "Alt":
          case "Escape":
            break;

          case "Home":
          case "ArrowUp":
            if (state.shiftKey) {
              if (copy.selectionStart != 0) {
                copy.selectionStart = 0;
                if (start != end && state.selectionDirection == 1) {
                  copy.selectionEnd = start;
                }
              }
            } else {
              copy.selectionStart = copy.selectionEnd = 0;
            }
            break;

          case "End":
          case "ArrowDown":
            if (state.shiftKey) {
              if (copy.selectionEnd != text.length) {
                copy.selectionEnd = text.length;
                if (start != end && state.selectionDirection == -1) {
                  copy.selectionStart = end;
                }
              }
            } else {
              copy.selectionStart = copy.selectionEnd = text.length;
            }
            break;

          case "ArrowLeft":
            if (state.shiftKey) {
              if (start == end) {
                if (start > 0) {
                  copy.selectionDirection = -1;
                  copy.selectionStart--;
                }
              } else if (state.selectionDirection != 0) {
                if (state.selectionDirection == -1) {
                  copy.selectionStart = Math.max(start-1, 0);
                } else if (state.selectionDirection == 1) {
                  copy.selectionEnd--;
                }
              }
            } else {
              if (start != end) {
                copy.selectionEnd = start;
              } else {
                copy.selectionStart = copy.selectionEnd = Math.max(start-1, 0);
              }
            }
            break;

          case "ArrowRight":
            if (state.shiftKey) {
              if (start == end) {
                if (copy.selectionStart < text.length) {
                  copy.selectionDirection = 1;
                  copy.selectionEnd++;
                }
              } else if (state.selectionDirection != 0) {
                if (state.selectionDirection == -1) {
                  copy.selectionStart++;
                } else if (state.selectionDirection == 1) {
                  copy.selectionEnd = Math.min(end+1, text.length);
                }
              }
            } else {
              if (start != end) {
                copy.selectionStart = end;
              } else {
                copy.selectionStart = copy.selectionEnd = Math.min(start+1, text.length);
              }
            }
            break;

          default:
            if (copy.metaKey) {
              switch (e.key) {
                case "a":
                  copy.selectionStart = 0;
                  copy.selectionEnd = text.length;
                  copy.selectionDirection = -1;
                  break;
              }
            } else {
              if (copy.capsLock) {
                insert = copy.shiftKey ? e.key.toLowerCase() : e.key.toUpperCase();
              } else {
                insert = copy.shiftKey ? e.key.toUpperCase() : e.key.toLowerCase();
              }
            }
            break;
        }

        if (insert) {
          copy.textContent = text.slice(0, start) + insert + text.slice(end);
          copy.selectionEnd = copy.selectionStart = start+insert.length;
        }
      }
    } else if (e.type == "keyup") {
      switch (e.key) {
        case "Shift":
          copy.shiftKey = false;
          break;

        case "Meta":
        case "Control":
          copy.metaKey = false;
          break;

        case "CapsLock":
          copy.capsLock = false;
          break;
      }
    }

    if (settings.assembleHangul) {
      var oldText = Hangul.disassemble(copy.textContent);
      var oldLength = copy.textContent.length;

      copy.textContent = Hangul.assemble(oldText);

      var difference = copy.textContent.length - oldLength;
      if (difference != 0) {
        copy.selectionStart += difference;
        copy.selectionEnd += difference;
      }
    }

    return copy;
  }

  getStateAtTimeStamp(inputEvents, timeStamp) {
    var state = new SimulationState();

    for (let e of inputEvents) {
      if (e.timeStamp > timeStamp) {
        return state;
      }
      state = settings.useBakedStates && e.bakedState ? e.bakedState : this.simulateEvent(state, e);
    }

    return state;
  }

  clearState() {
    this.domElement.textContent = "";
    while (this.caretElement.lastChild) {
      this.caretElement.lastChild.remove();
    }
  }

  printState(state) {
    if (
      this.lastPrintedState &&
      this.lastPrintedState.textContent == state.textContent &&
      this.lastPrintedState.selectionStart == state.selectionStart &&
      this.lastPrintedState.selectionEnd == state.selectionEnd
    ) {
      this.lastPrintedState = state;
      return;
    }

    this.lastPrintedState = state;

    if (!state) {
      this.clearState();
      return;
    }

    this.domElement.textContent = state.textContent;

    var start = state.selectionStart;
    var end = state.selectionEnd;

    if (this.domElement.classList.contains("monospace")) {
      if (start == end && end <= state.textContent.length - 1) {
        end++;
      }
    }

    var range = document.createRange();
    range.setStart(this.domElement.firstChild || this.domElement, start);
    range.setEnd(this.domElement.firstChild || this.domElement, end);

    while (this.caretElement.lastChild) {
      this.caretElement.lastChild.remove();
    }
    this.caretElement.appendChild(range.extractContents());

    range.insertNode(this.caretElement);

    return state;
  }

  printStateAtTimestamp(inputEvents, timeStamp) {
    this.printState(this.getStateAtTimeStamp(inputEvents, timeStamp));
  }

  printFinalState(inputEvents) {
    if (!events || events.length == 0) {
      this.clearState();
    } else {
      this.printState(this.getStateAtTimeStamp(inputEvents, events[events.length - 1].timeStampStamp));
    }
  }

  getBakedEvents(inputEvents) {
    var events = [];
    var state = new SimulationState();

    var originalBakeSetting = settings.useBakedStates;
    settings.useBakedStates = true;

    for (let e of inputEvents) {
      state = this.simulateEvent(state, e);
      events.push(new InputEvent(e.strippedEvent, new SimulationState(state), e.timeStamp));
    }

    settings.useBakedStates = originalBakeSetting;

    return events;
  }

  remove() {
    this.caretElement.remove();
    this.domElement.remove();
  }
}

function createClearedTextLog(clearedText) {
  var log = clearedText.split("\r\n");
  return log;
}

class Conversation {
  constructor() {
    this.domElement = createElement("div", { parent: document.body, className: "conversation" });
    this.printedTexts = [];
    this.typingElements = [];
  }

  clear() {
    for (let i=this.printedTexts.length-1; i>=0; i--) {
      this.printedTexts[i].domElement.remove();
      this.printedTexts.splice(i, 1);
    }
    for (let i=this.typingElements.length-1; i>=0; i--) {
      this.typingElements[i].remove();
      this.typingElements.splice(i, 0);
    }
  }

  getBaked(bakedTracks) {
    var output = [];
    var timeStamps = [];

    for (let bakedEvents of bakedTracks) {
      for (let e of bakedEvents) {
        timeStamps.push(e.timeStamp);
      }
    }

    // remove duplicate timestamps
    var uniqueTimestamps = [];
    for (let p of timeStamps) {
      if (uniqueTimestamps.indexOf(p) == -1) {
        uniqueTimestamps.push(p);
      }
    }
    uniqueTimestamps.sort((a, b) => a - b);

    var originalBakeSetting = settings.useBakedStates;
    settings.useBakedStates = true;

    for (let p of uniqueTimestamps) {
      var states = [];
      for (let bakedEvents of bakedTracks) {
        states.push(Simulator.prototype.getStateAtTimeStamp(bakedEvents, p));
      }

      var bakedFrame = this.getBakedFrame(states);

      if (output.length > 0) {
        const previousFrame = output[output.length - 1];
        if (previousFrame.length != bakedFrame.length) {
          output.push(bakedFrame);
        }
      } else {
        output.push(bakedFrame);
      }
    }

    settings.useBakedStates = originalBakeSetting;

    return output;
  }

  getBakedFrame(states) {
    var texts = [];

    for (let i=0; i<states.length; i++) {
      const state = states[i];

      if (!state) continue;

      const className = "dialogue c"+i;
      for (let t=0; t<state.clearedText.length; t+=2) {
        texts.push({
          textContent: state.clearedText[t],
          className: className,
          timeStamp: state.clearedText[t+1]
        })
      }
    }

    texts.sort((a, b) => a.timeStamp - b.timeStamp);

    return texts;
  }

  print(states) {
    var texts = this.getBakedFrame(states);

    for (let i=0; i<texts.length; i++) {
      const printed = this.printedTexts[i];
      const text = texts[i];
      if (printed && printed.textContent == text.textContent && printed.timeStamp == text.timeStamp) {
        continue;
      } else {
        text.domElement = createElement("div", { parent: this.domElement, className: text.className, textContent: text.textContent });
        this.printedTexts.push(text);
      }
    }

    for (let i=this.printedTexts.length-1; i>=0; i--) {
      const printed = this.printedTexts[i];
      const text = texts[i];
      if (!text) {
        printed.domElement.remove();
        this.printedTexts.splice(i, 1);
      }
    }

    for (let i=this.typingElements.length-1; i>=0; i--) {
      this.typingElements[i].remove();
      this.typingElements.splice(i, 0);
    }

    for (let i=0; i<states.length; i++) {
      const state = states[i];
      if (state.textContent != "" && state.selectionStart == state.selectionEnd) {
        this.typingElements.push(createElement("div", { parent: this.domElement, className: "typing c"+i, textContent: "user is typing..." }));
      }
    }

    this.domElement.scrollTop = this.domElement.scrollHeight;
  }
}
