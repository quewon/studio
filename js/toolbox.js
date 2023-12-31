function createElement(type, props) {
  const element = document.createElement(type);

  props = props || {};

  if (props.textContent) element.textContent = props.textContent;
  if (props.innerHTML) element.innerHTML = props.innerHTML;
  if (props.className) element.className = props.className;
  if (props.parent) props.parent.appendChild(element);
  return element;
}

function createTemplateCopy(template, props) {
  let div = document.createElement("div");
  let clone = template.content.cloneNode(true);
  div.appendChild(clone);

  for (let prop in props) {
    div.querySelector("[name='"+prop+"']").textContent = props[prop];
  }

  return div;
}

function getFormattedTime(milliseconds) {
  var seconds = milliseconds / 1000;
  var minutes = seconds / 60;

  // var ms = Math.floor(milliseconds % 1000 / 100);
  var sec = Math.floor(seconds % 60);
  var min = Math.floor(minutes % 60);
  var hour = Math.floor(minutes / 60);

  var time = "";
  if (hour >= 1) time += hour+":";
  time += min < 10 ? "0"+min : min;
  time += ":";
  time += sec < 10 ? "0"+sec : sec;
  // time += ".";
  // time += ms;

  return time;
}

function lerp(a, b, t) {
  return a * (1-t) + b * t;
}

function clamp(x, lowerlimit, upperlimit) {
  lowerlimit = lowerlimit || 0;
  upperlimit = upperlimit || 1;

  if (x < lowerlimit) return lowerlimit;
  if (x > upperlimit) return upperlimit;
  return x;
}

function smoothstep(x, edge0, edge1) {
  edge0 = edge0 || 0;
  edge1 = edge1 || 1;

  x = clamp((x - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

function smootherstep(x, edge0, edge1) {
  edge0 = edge0 || 0;
  edge1 = edge1 || 1;
  x = clamp((x - edge0) / (edge1 - edge0));
  return x * x * x * (3 * x * (2 * x - 5) + 10);
}
