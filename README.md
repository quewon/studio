# live text recording studio

⚠️ This tool is a work in progress! ⚠️

This live text recording studio ("text studio" for short) is a tool for creating realtime text input recordings and conversations. It's inspired by online typing tests and text message conversations I've had with my friends over the years.

The text studio interface is similar to that of an audio or video editing program. It's mainly composed of three sections: the **timeline**, for visualizing and editing clips; an **inspector**, for more detailed operations; an **output**.

- [Menu Bar](#menu-bar)
- [Timeline](#timeline)
- - [Components](#components)
  - [Timeline actions](#timeline-actions)
- [Inspector](#inspector)
- [Output](#output)
- - [Simulator](#simulator)
  - - [Keys that have been accounted for](#keys-that-have-been-accounted-for)
    - [Implemented keyboard functions](#implemented-keyboard-functions)
  - [Conversation](#conversation)
- [Exporting](#exporting)
- - [Baking](#baking)

## Menu Bar

- **\[+ track\]**: Creates a new track
- **\[record\]**: Starts/stops recording
- **\[<|\]**: Moves playhead to the start of the track
- **\[play\]**: Starts playback
- **\[|>\]**: Moves playhead to the end of the track
- **\[import\]**: Opens the file browser
- **\[export\]**: Opens the export menu
- **\[settings\]**: Opens the settings menu

## Timeline

From the timeline you can view the time information (TRACK LENGTH: X | PLAYHEAD: X | XX:XX / XX:XX), visualize the components in your project, and move the playhead.

### Components

Each section in the timeline is a **track**.

When you start recording, a new **clip** is created. Tracks are groups of clips.

When you input something while recording, an **event** is added to the current clip. Clips are groups of events.

### Timeline actions

- **Click** to select a component (track/clip/event)
- **Drag** clips to move them around
- **Backspace**, **Delete** to delete a selected component

## Inspector

Below the timeline is the component log and component inspector. Here you can access a variety of functions to manipulate your components.

WARNING: the delete button at the bottom of every inspector will not ask you for confirmation (unlike the aforementioned timeline action)!

## Output

The output interface displays the current output state at playhead position. By default, you can also see the [**conversation log**](#conversation).

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
- Home, End

#### Implemented keyboard functions

- **Enter**: Creates newline
- **Shift**: Capitalizes keys while pressed, affects text selection
- **CapsLock**: Inverts Shift key capitalization
- **Meta**, **Control**: Stops key input
  - **CMD+A** / **CTRL+A**: Selects the entire text
- **Arrow keys**: Affects caret position and text selection
- **Home**, **End**: Affects caret position and text selection

### Conversation

The **conversation**, when enabled, is a log of all cleared text. You can toggle it on and off in the settings menu using the \[print conversation\] button. If you're recording a monologue, it might help to turn this off. (Note: when conversations are off, they won't be exported in the recording data.)

## Exporting

You can export projects (which contain project data, such as which tracks are muted/selected/locked) or recordings (which merge the clips in each track together, and contain baked states).

### Baking

States are normally calculated by the input simulator in real time. Baked states are just state data, but baked into event data. I don't know if I'm using these words properly, but I'm hoping the meaning comes across. Currently, there's no setting in the text studio to utilise these baked states. When you import a recording file, the text studio ignores baked states and uses input event data.
