window.Battleship = Battleship = function () {
  this.shipsToPlace = [2, 3, 3, 4, 5];
  this.ships = [];
  this.taken = [];
  this.state = "WAITING_FOR_OPPONENT";
};

Battleship.prototype.notTaken = function (segments) {
  var conflict = false;
	
  this.taken.forEach(function(takenSeg){
    segments.forEach(function(shipSeg){
      if (takenSeg[0] === shipSeg[0] && takenSeg[1] === shipSeg[1]) {
        conflict = true;
      }
    });
  });
	
  return !conflict;
};

Battleship.prototype.placeShip = function (front, back) {
  var length;
  var segments = [];

  if (front[0] === back[0] || front[1] === back[1]) {
    length = Math.abs(front[0] - back[0] + front[1] - back[1]) + 1;
  }

  var index = this.shipsToPlace.indexOf(length);

  if (index > -1) {
    var ship = new Ship (front, back);
		
    if (this.notTaken(ship.segments)) {
      this.ships.push(ship);
      this.shipsToPlace.splice(index, 1);
      this.taken = this.taken.concat(ship.segments);
      segments = ship.segments;
    }
  }

  if (this.shipsToPlace.length === 0) {
    this.state = GameStates.SHOOT;
  }

  return segments;
};

Battleship.prototype.checkShot = function (coords) {
  var hit = false;
  var gameOver = true;
	
  this.ships.forEach(function (ship) {
    ship.segments.forEach(function (segment) {
      if (segment[0] === coords.row && segment[1] === coords.col) {
        segment[2] = "hit";
        hit = true;
      }
    });

    if (!ship.checkSunk()) {
      gameOver = false
    }
  });

  return { hit: hit, gameOver: gameOver };
};

// window.ComputerBattleship = ComputerBattleship = function () {
// 	Battleship.call(this);
// };
//
// ComputerBattleship.prototype = {
// 	placeShips: function () {
// 		var i = 0;
//
// 		while (this.shipsToPlace.length > 0) {
// 			var len  = this.shipsToPlace.pop();
// 			var ship = new Ship([0, i], [len - 1, i]);
// 			this.ships.push(ship);
// 			i++
// 		}
// 	}
// };



















