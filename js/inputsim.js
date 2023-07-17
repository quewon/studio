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
    this.shiftKey = state.shiftKey || 0;

    this.clearedText = [];
    if (state.clearedText) {
      for (let text of state.clearedText) {
        this.clearedText.push(text);
      }
    }
  }
}

class InputEvent {
  constructor(e, state, globalTime) {
    this.strippedEvent = new StrippedEvent(e);
    this.bakedState = state || null;
    this.globalTime = globalTime || 0;
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
    const timeStamp = inputEvent.globalTime;

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
            if (settings.clearWithEnter) {
              copy.clearedText.push(copy.textContent);
              copy.clearedText.push(timeStamp);
              copy.textContent = "";
              copy.selectionStart = copy.selectionEnd = 0;
            } else {
              insert = "\r\n";
            }
            break;

          case "Shift":
            copy.shiftKey = true;
            break;

          case "Alt":
          case "Control":
          case "Meta":
          case "Escape":
          case "ArrowUp":
          case "ArrowDown":
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
            if (state.shiftKey) {
              insert = e.key.toUpperCase();
            } else {
              insert = e.key;
            }
            break;
        }

        if (insert) {
          copy.textContent = text.slice(0, start) + insert + text.slice(end);
          copy.selectionEnd = copy.selectionStart = start+insert.length;
        }
      }
    } else if (e.type == "keyup") {
      if (e.key == "Shift") {
        copy.shiftKey = false;
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
      if (e.globalTime > timeStamp) {
        return state;
      }
      state = settings.useBakedState && e.bakedState ? e.bakedState : this.simulateEvent(state, e);
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
    this.lastPrintedState = state;

    if (!state) {
      this.clearState();
      return;
    }

    this.domElement.textContent = state.textContent;

    var start = state.selectionStart;
    var end = state.selectionEnd;

    if (start == end && end <= state.textContent.length - 1) {
      end++;
    }

    var range = document.createRange();
    range.setStart(this.domElement.firstChild || this.domElement, start);
    range.setEnd(this.domElement.firstChild || this.domElement, end);

    while (this.caretElement.lastChild) {
      this.caretElement.lastChild.remove();
    }
    this.caretElement.appendChild(range.extractContents());

    range.insertNode(this.caretElement);
  }

  printStateAtTimestamp(inputEvents, timeStamp) {
    this.printState(this.getStateAtTimeStamp(inputEvents, timeStamp));
  }

  printFinalState(inputEvents) {
    if (!events || events.length == 0) {
      this.clearState();
    } else {
      this.printState(this.getStateAtTimeStamp(inputEvents, events[events.length - 1].globalTimeStamp));
    }
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
  }

  clear() {
    while (this.domElement.lastElementChild) {
      this.domElement.lastElementChild.remove();
    }
  }

  print(states) {
    this.clear();

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

    for (let text of texts) {
      createElement("div", { parent: this.domElement, className: text.className, textContent: text.textContent });
    }
  }
}
