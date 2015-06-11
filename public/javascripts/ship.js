window.Ship = Ship = function (front, back) {
  // this.length = options.length;
  this.front = front;
  this.back = back;
  this.segments = this.createSegments();
};

Ship.prototype.createSegments = function () {
  var segments = window.coordsBetween(this.front, this.back);
  segments.forEach(function (segment) {
    segment.push(null);
  })

  return segments;
};

Ship.prototype.checkSunk = function () {
  var sunk = true
  this.segments.forEach(function (segment) {
    if (segment[2] !== "hit") {
      sunk = false;
    }
  });
  return sunk;
};
