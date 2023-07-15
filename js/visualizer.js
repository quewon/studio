class InputVisualizer {
  constructor() {
    const keyCodes = ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM"];
    this.keyCodes = {};

    this.domElement = createElement("div", { className: "visualizer" });

    for (let code of keyCodes) {
      this.keyCodes[code] = {
        down: false,
        velocity: 0,
        value: 0,
        element: createElement("div", { parent: this.domElement })
      }
    }
  }

  keydown(e) {
    if (e.code in this.keyCodes) {
      this.keyCodes[e.code].down = true;
    }
  }

  keyup(e) {
    if (e.code in this.keyCodes) {
      this.keyCodes[e.code].down = false;
    }
  }

  blur() {
    for (let code in this.keyCodes) {
      this.keyCodes[code].down = false;
    }
  }

  update(delta) {
    for (let key in this.keyCodes) {
      const v = this.keyCodes[key];

      if (v.down) {
        v.velocity += .002 * delta;
        v.velocity = Math.min(v.velocity, 1);
      } else {
        v.velocity -= .002 * delta;
      }

      v.value += v.velocity * delta;

      if (v.value > 100) {
        v.value = 100;
      } else if (v.value < 0) {
        v.value = 0;
        v.velocity = 0;
      }

      v.element.style.height = v.value +"%";
    }
  }
}
