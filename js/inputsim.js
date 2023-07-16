class InputSimulator {
  constructor() {
    this.domElement = createElement("div", { parent: document.body, className: "output" });
    this.caretElement = createElement("div", { parent: this.domElement, className: "caret" });
    this.selectionStart = this.selectionEnd = 0;
  }

  simulateEvent(state, e) {
    const text = state.textContent;
    const start = state.selectionStart;
    const end = state.selectionEnd;

    var copy = {
      textContent: state.textContent,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
      shiftKey: state.shiftKey,
      selectionDirection: state.selectionDirection
    };

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

    return copy;
  }

  getStateAtTimeStamp(events, timeStamp) {
    var state = {
      textContent: "",
      selectionStart: 0,
      selectionEnd: 0,
      shiftKey: false,
      selectionDirection: 0
    }

    for (let e of events) {
      if (e.globalTime > timeStamp) {
        return state;
      }
      state = this.simulateEvent(state, e.event);
    }

    return state;
  }

  clearState() {
    this.domElement.textContent = "";
    while (this.caretElement.lastChild) {
      this.caretElement.lastChild.remove();
    }
    // this.domElement.appendChild(this.caretElement);
  }

  printState(state) {
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

  printStateAtTimestamp(events, timeStamp) {
    this.printState(this.getStateAtTimeStamp(events, timeStamp));
  }

  printFinalState(events) {
    if (!events || events.length == 0) {
      this.clearState();
    } else {
      this.printState(this.getStateAtTimeStamp(events, events[events.length - 1].globalTimeStamp));
    }
  }
}
