let audio;
const supportTable = [["mousedown", "mouseup", "mousemove"], [""]]
const movementRef = {
  mouse: ["movementX", "movementY"]
}

// analyze int into hr / min / sec obj
function timeConv(sec_num) {
  let t = {};
  t.hours   = Math.floor(sec_num / 3600);
  t.minutes = Math.floor((sec_num - (t.hours * 3600)) / 60);
  t.seconds = sec_num - (t.hours * 3600) - (t.minutes * 60);

  // to avoid unneccessary detail (like an hour stamp of 00 when length is only a few minutes, etc)
  t.places = 1;
  if (t.minutes > 0) {t.places = 2}
  if (t.hours > 0) {t.places = 3}

  return t;
}

// to format int to time formatted string
function toHHMMSS(n, ovrd) {
  let t = timeConv(n);

  if (t.hours   < 10) {t.hours   = "0"+t.hours;}
  if (t.minutes < 10) {t.minutes = "0"+t.minutes;}
  if (t.seconds < 10) {t.seconds = "0"+t.seconds;}

  let ts = '';
  if (t.places > 2 || ovrd === 3) {ts += t.hours+':'}
  if (t.places > 1 || ovrd === 2) {ts += t.minutes+':'}
  return ts + t.seconds;
}

function setTooltip(tooltip, e) {
  let ttd = tooltip.getBoundingClientRect();
  tooltip.style.top = ((e.clientY - ttd.height) - 5) + "px";
  tooltip.style.left = (e.clientX - ttd.width / 2) + "px";
  tooltip.classList.add("on");
}

//
//  BUTTONS
//

function powerAudio(audio) {
  for (file of mpConfig.files) {
    let nuEl = document.createElement("source");
    nuEl.src = mpConfig.location + file;
    audio.appendChild(nuEl);
  }
}

function powerCover(img, tooltip) {
  let active = false;
  img.src = mpConfig.location + mpConfig.cover;
  tooltip.innerHTML = mpConfig.artist + " - " + mpConfig.song;
  img.addEventListener("mousedown", (e) => {
    e.preventDefault();
    setTooltip(tooltip, e);
    active = true;
  })
  window.addEventListener("mouseup", (e) => {
    active = false;
    tooltip.classList.remove("on");
  });
  window.addEventListener("mousemove", (e) => {
    if (active === true) {
      setTooltip(tooltip, e);
    }
  });
}

function powerPlayPauseBtn(btn) {
  let playback = false;
  btn.addEventListener("click", (event) => {
    if (playback === false) {
      btn.setAttribute("d", "M 0 0 L 0 8 L 3 8 L 3 0 L 0 0 M 8 0 L 8 8 L 5 8 L 5 0 L 8 0") // pause logo
      playback = true;
      audio.play();
    } else {
      btn.setAttribute("d", "M 0 0 L 0 8 L 8 4 L 0 0"); // play logo
      playback = false;
      audio.pause();
    }
  })
  // change to play button when song ends
  audio.addEventListener("ended", (e) => {
    btn.setAttribute("d", "M 0 0 L 0 8 L 8 4 L 0 0"); // play logo
    playback = false;
  });
}

function circleD(deg, e, l) {
  let rx = Math.abs(((e.clientX - l.x) - l.width / 2) / (l.width / 2));
  let ry = Math.abs(((e.clientY - l.y) - l.height / 2) / (l.height / 2));
  let rd = Math.sqrt(Math.pow(rx, 2) + Math.pow(ry, 2)); // distance from center of circle (hypotenuse, a^2 + b^2 = c^2)
  let dx = e.movementX * (Math.cos((deg / 180) * Math.PI));
  let dy = e.movementY * (Math.sin((deg / 180) * Math.PI));
  return ((dx + dy) / rd) / (l.width / 120);
}

// change degrees based on movement of mouse
function newPos(r, d, limit) { // r = deg, d = delta
  if (r + d > -1 * limit && r + d < limit) { // if movement does not goes past knob limits at each side (in deg)
    r += d;
  } else { 
    if (d * r < 0) { // if movement is opposite direction of limits (if the movement of the mouse and the degree are opposite each other, the result should be negative, neg * pos = neg)
      r += d;
    } else { // movement goes past limits, set to max
      r = limit * (Math.sign(r));
    }
  }
  return r;
}

function setVolumeKnob(knob, deg, limit) {
  knob.style.transform = "rotate(" + deg + "deg)";
  audio.volume = deg / (limit * 2) + 0.5; // volume is 0 to 1, so divide degrees by limit * 2 and add 0.5 (since degrees go from -limit to +limit)
}

function powerVolumeKnob(knob, tooltip) {
  const knobLimit = 130; // max degrees knob can turn (CHANGE TO SET TURN LIMITS, MAX 179)
  let deg = 0; // degrees of rotation (CHANGE TO SET DEFAULT VOLUME)
  setVolumeKnob(knob, deg, knobLimit); // sets initial state
  let l, active = false; // for only turning if true
  knob.addEventListener("wheel", (e) => {
    knob.style.transition = "transform 0.5s";
    deg = newPos(deg, (e.deltaY / -10), knobLimit);
    setVolumeKnob(knob, deg, knobLimit);
  });
  // if mousedown starts on knob
  knob.addEventListener("mousedown", (e) => {
    e.preventDefault();
    l = knob.parentElement.getBoundingClientRect();
    setTooltip(tooltip, e);
    active = true;
  }); 
  // stop when mouse up
  window.addEventListener("mouseup", (e) => {
    active = false;
    tooltip.classList.remove("on");
  }); 
  window.addEventListener("mousemove", (e) => {
    e.preventDefault(); // stops from highlighting text + other shit browser usually does while mouse down
    if (active === true) { // if turn is active (mousedown)
      knob.style.transition = "transform 0s";
      deg = newPos(deg, circleD(deg, e, l), knobLimit);
      setVolumeKnob(knob, deg, knobLimit);
      tooltip.innerHTML = Math.round(audio.volume * 100) + "%";
      setTooltip(tooltip, e);
    }
  });
}

function powerProgressBar(marker, line, tooltip) {
  let l = line.parentElement.getBoundingClientRect();
  let limit = l.width / 2;
  let time = 0;
  let active = false;
  tooltip.innerHTML = toHHMMSS(Math.round(audio.currentTime), timeConv(audio.duration).places) + " / " + toHHMMSS(Math.round(audio.duration));
  audio.addEventListener("timeupdate", (e) => {
    tooltip.innerHTML = toHHMMSS(Math.round(audio.currentTime), timeConv(audio.duration).places) + " / " + toHHMMSS(Math.round(audio.duration));
    marker.setAttribute("cx", ((audio.currentTime / audio.duration) * 14.25) + 1)
  });
  line.addEventListener("mousedown", (e) => {
    e.preventDefault();
    l = line.parentElement.getBoundingClientRect();
    setTooltip(tooltip, e);
    active = true;
  });
  window.addEventListener("mouseup", (e) => {
    active = false;
    tooltip.classList.remove("on");
  });
  window.addEventListener("mousemove", (e) => {
    if (active === true) {
      console.log(time)
      //marker.setAttribute("cx", e.clientX)
      setTooltip(tooltip, e);
    }
  });
}

window.addEventListener("load", (event) => {
  audio = document.getElementById("mp-audio");
  powerAudio(audio);
  powerCover(document.getElementById("mp-cover-art"), document.getElementById("mp-cover-tt"));
  powerPlayPauseBtn(document.getElementById("mp-play-pause"));
  powerVolumeKnob(document.getElementById("mp-vol-knob"), document.getElementById("mp-vol-tt"));
  powerProgressBar(document.getElementById("mp-pb-marker"), document.getElementById("mp-pb-bar"), document.getElementById("mp-pb-tt"));
});