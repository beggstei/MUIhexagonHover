// initialize
function init() {
    // start motion detection if available
    if ("RelativeOrientationSensor" in window) addMotionControls();
    else debug("no motion sensor detected");
  }
  
  function debug(message) {
    const containerEl = document.getElementById("debug");
    const messageEl = document.createElement("div");
    messageEl.innerHTML = message;
    containerEl.prepend(messageEl);
    console.log(message);
  }
  
  function addMotionControls() {
    let referenceY; // current zero reference point
    let factor = -5000; // factor to map sensor data to pixels (sensitivity)
    let screenCenter = new Point(window.innerWidth / 2, window.innerHeight / 2);
    let idleTimeout;
    let idleDelay = 4000; //idle time before reseting reference point
    let autoSelect = false; // selecting items with time delay
    let drawMotionFlag = true; // draw motion values for debugging
  
    // motion buffer stuff
    let motionBuffer = []; // motion value buffer
    let averageY = 0;
    let lastAverageY = 0; // last average of buffer values
    let bufferIterations = 0; // how many times buffer has been iterated
    let targetPositionInPx = 0;
    let currentPositionInPx = 0;
    let lastPositionInPx = 0;
    const bufferIterationLimit = 5; // iterations before new average calculation is triggered
    const bufferLength = 10; // length of value buffer
    const noiseThreshold = 30; // threshold in pixel to avoid sensor noise
    const innerLimit = 50; // threshold in pixel to define inactive area around the reference
    const outerLimit = 400;
  
    // create canvas element for motion visualization
    const canvasEl = document.createElement("canvas");
    canvasEl.id = "canvas";
    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;
    document.getElementById("app").appendChild(canvasEl);
  
    //available headset sensors: accelerometer, gyroscope, relativeOrientation, linearAcceleration, GravitySensor
    //unavailable headset sensors: magnetometer (this results in horizontal drifting)
    const options = { frequency: 30, referenceFrame: "device" };
    const sensor = new RelativeOrientationSensor(options);
    sensor.addEventListener("reading", onChangeOrientation);
  
    // get sensor permission via Permission API
    Promise.all([
      navigator.permissions.query({ name: "accelerometer" }),
      navigator.permissions.query({ name: "gyroscope" }),
    ]).then((results) => {
      if (results.every((result) => result.state === "granted")) sensor.start();
      else debug("No permissions to use RelativeOrientationSensor.");
    });
  
    // handle motion sensor event
    function onChangeOrientation(event) {
      let quaternion = event.target.quaternion;
      let y = quaternion[1];
  
      debug(y);
  
      // write quaternion y value into motion buffer
      motionBuffer.push(y);
  
      // on first iteration
      if (!referenceY) {
        referenceY = y; // set initial reference point
        averageY = y; // set initial last average point
        lastAverageY = y; // set initial last average point
        lastPositionInPx = (averageY - referenceY) * factor;
      }
  
      // calculate positions in pixels
      targetPositionInPx = (averageY - referenceY) * factor; // target position in pixels
      currentPositionInPx =
        lastPositionInPx + (targetPositionInPx - lastPositionInPx) * 0.1; // move towards target
      currentPositionInPx = helpers.clamp(
        currentPositionInPx,
        -outerLimit,
        outerLimit,
      ); // clamp to reasonable range
      lastPositionInPx = currentPositionInPx; // save current position for later
  
      // draw sensor motion for debugging
      if (drawMotionFlag) drawMotion(currentPositionInPx);
  
      // select item at target position if conditions are met
      let averageDiffInPx = Math.abs((lastAverageY - averageY) * factor);
      let distFromCenter = Math.abs(currentPositionInPx);
      // if position is withing limits
      if (distFromCenter < outerLimit && distFromCenter > innerLimit) {
        // movement is not noise
        if (averageDiffInPx > noiseThreshold) {
          let itemEl = focusClosestItem(currentPositionInPx);
          lastAverageY = averageY; // save averageY for later comparison
  
          // trigger autoselection via motion
          if (autoSelect) {
            let progressEl = itemEl.querySelector(".progress");
            progressEl.style.animation = "progress 2s ease-out forwards";
          }
  
          // handle auto reseting of reference point
          clearTimeout(idleTimeout);
          idleTimeout = setTimeout(() => {
            referenceY = averageY;
          }, idleDelay);
        }
      } else deselectAllItems();
  
      // fill buffer with datapoints
      if (motionBuffer.length > bufferLength) {
        motionBuffer.shift(); // limit buffer length
  
        // calculate the new average value as soon as bufferiterationlimit reached
        if (bufferIterations > bufferIterationLimit) {
          averageY = motionBuffer.reduce((a, b) => a + b) / motionBuffer.length;
          bufferIterations = 0;
        }
        bufferIterations++;
      }
    }
  
    function drawMotion(y) {
      if (canvasEl.getContext) {
        const ctx = canvasEl.getContext("2d");
        const pointSize = 10;
  
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  
        // save zone
        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y, innerLimit, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255, 0, 255, .6)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
  
        // outer limit
        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y, outerLimit, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255, 0, 255, .6)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
  
        // distance
        ctx.beginPath();
        ctx.moveTo(screenCenter.x, screenCenter.y);
        ctx.lineTo(screenCenter.x, screenCenter.y + y);
        ctx.strokeStyle = "rgba(255, 0, 255, .6)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
  
        // target
        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y + y, pointSize, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 0, 255, .6)";
        ctx.fill();
        ctx.closePath();
      }
    }
  }
  
  // start app
  init();
  