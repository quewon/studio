# live text recording studio

(⚠️ This README is a work in progress! ⚠️)

This live text recording studio ('text studio' for short) is a tool for creating realtime text input recordings and conversations. It's inspired by online typing tests where you can playback a recording of your typing, and text-only conversations I've had with my friends!

The text studio interface is similar to that of an audio or video editing program. It's mainly composed of three sections: the **timeline**, for visualizing and editing clips; an **inspector**, for more detailed operations; an **output**.

## Menu Bar

## Timeline

## Inspector

### Events

### Clips

### Tracks

## Output

The output interface displays the current output state at playhead position. By default, you can also see the **conversation log**. (This can be turned off in menu bar > settings > \[print conversation\].)

### Simulator

Each track has an **input simulator** that runs in the background and determines what the output looks like. The simulator uses raw key data from the track's log of events. Because the simulator decides what each key does, this means that a lot of native keyboard functions might not work.

#### Keys that have been accounted for

- General keys (abc, 가나다, etc)
- Enter
- Shift
- Meta, Control
- CapsLock
- Alt, Escape
- Arrow keys

#### Implemented keyboard functions

- Enter (creates newline)
- Shift (capitalizes keys while pressed, affects text selection)
- CapsLock (inverts Shift key capitalization)
- Meta, Control (stops key input)
  - cmd+A / ctrl+A (selects the entire text)
- Arrow keys (affects caret position and text selection)

### Conversation

The **conversation**, when turned on, is a log of all cleared text. Within the settings menu, the relevant settings are \[print conversation\] and \[clear on enter\]. If you're recording a monologue, it might help to turn these off. (Note: when conversations are turned off, they also won't be exported in the recording data.)

## Keyboard shortcuts

- **Delete** : You can delete the currently selected event/clip/track by hitting delete. The program will prompt you about whether or not you're sure. (There's also a delete button at the bottom of every inspector menu. However, those buttons won't ask you for a confirmation.) Make sure to only delete something if you're sure, because you cannot undo it.

## Exporting

