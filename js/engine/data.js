var fileReader = new FileReader();
function readFile(input) {
  if (input.files.length > 0) {
    fileReader.readAsText(input.files[0]);
    fileReader.onload = function(e) {
      importJSON(e.target.result);
    }
    input.value = "";
  }
}

function exportProject() {
  var data = {
    isProject: true,
    TRACKS: [],
    SETTINGS: settings
  }

  for (let track of allTracks) {
    var simplifiedTrack = {
      clips: [],
      totalTime: track.totalTime,
      selected: track.selected,
      locked: track.locked,
      muted: track.muted
    };

    for (let clip of track.clips) {
      var simplifiedClip = {
        log: [],
        startTime: clip.startTime,
        totalTime: clip.totalTime,
        trimStart: clip.trimStart,
        trimmedTime: clip.trimmedTime
      };
      for (let e of clip.log) {
        simplifiedClip.log.push({
          strippedEvent: e.strippedEvent,
          localTimeStamp: e.localTimeStamp
        });
      }
      simplifiedTrack.clips.push(simplifiedClip);
    }

    data.TRACKS.push(simplifiedTrack);
  }

  return JSON.stringify(data, null, 2);
}

function exportBaked() {
  var data = {
    isBaked: true,
    TRACKS: [],
    SETTINGS: {}
  };

  for (let setting in settings) {
    data.SETTINGS[setting] = settings[setting];
  }

  for (let track of allTracks) {
    if (track.muted) continue;
    const bakedEvents = track.simulator.getBakedEvents(track.inputEvents);
    data.TRACKS.push(bakedEvents);
  }

  if (settings.printConversation) {
    data.CONVERSATION = conversation.getBaked(data.TRACKS);
  }

  return JSON.stringify(data, null, 2);
}

function importJSON(json) {
  var data = JSON.parse(json);
  if (data.isProject) {
    importProject(data);
  } else if (data.isBaked) {
    importBaked(data);
  } else {
    alert("the file you're trying to load is not a project or a recording.");
  }
}

function importProject(data) {
  try {
    if (data.SETTINGS) initSettings(data.SETTINGS);

    var isEmpty = false;
    if (allTracks.length == 1 && currentTrack.clips.length == 0) {
      isEmpty = true;
    }

    if (data.TRACKS) {
      for (let t of data.TRACKS) {
        var track = new Track();
        track.setTotalTime(t.totalTime);
        for (let c of t.clips) {
          var clip = new Clip(track);
          for (let e of c.log) {
            new RecordedEvent(e.strippedEvent, clip, e.localTimeStamp);
          }
          clip.startTime = c.startTime;
          clip.totalTime = c.totalTime;
          clip.trimStart = c.trimStart;
          clip.setTrimmedTime(c.trimmedTime);
        }
        if (t.selected) track.select();
        if (t.locked) track.lock();
        if (t.muted) track.mute();
      }
    }

    if (isEmpty) {
      allTracks[0].remove();
    }

    // setPlayheadTime(totalTime);

    if (settings.printConversation) conversation.clear();
    updateOutput();
  } catch {
    alert("file could not be fully loaded...");
  }
}

function importBaked(data) {
  try {
    if (data.SETTINGS) initSettings(data.SETTINGS);

    var isEmpty = false;
    if (allTracks.length == 1 && currentTrack.clips.length == 0) {
      isEmpty = true;
    }

    if (data.TRACKS) {
      for (let t of data.TRACKS) {
        var track = new Track();
        if (t.length > 0) {
          var clip = new Clip(track);
          for (let inputEvent of t) {
            new RecordedEvent(inputEvent.strippedEvent, clip, inputEvent.timeStamp);
          }
          clip.updateLogElement();
          clip.totalTime = t[t.length - 1].timeStamp;
          clip.setStartTime(0);
          clip.setTrimmedTime(clip.totalTime);
        }
      }
    }

    if (isEmpty) {
      allTracks[0].remove();
    }

    // setPlayheadTime(totalTime);

    conversation.clear();
    updateOutput();
  } catch {
    alert("file could not be fully loaded...");
  }
}

function getDateString() {
  var date = new Date();

  var d = " ";

  var day = date.getFullYear() +d+ date.getMonth() +d+ date.getDate();

  var hour = date.getHours();
  if (hour < 10) hour = "0"+hour;

  var min = date.getMinutes();
  if (min < 10) min = "0"+min;

  var sec = date.getSeconds();
  if (sec < 10) sec = "0"+sec;

  var time = hour +d+ min +d+ sec;

  return day +d+d+ time;
}

function createProjectFile(name) {
  name = prompt("what will you name this project?", getDateString());
  if (name) downloadFile([exportProject()], name+".txtstudio");
}

function createRecordingFile(name) {
  name = prompt("what will you name this recording?", getDateString());
  if (name) downloadFile([exportBaked()], name+".txtrec");
}

function downloadFile(json, fileName) {
  const file = new Blob(json, { type: 'text/plain' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}
