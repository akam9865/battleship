(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Battleship = Battleship = function () {
  this.shipsToPlace = [2, 3, 3, 4, 5];
  this.ships = [];
  this.taken = [];
  this.state = "WAITING_FOR_OPPONENT";
};

// Battleship.prototype.createShips = function () {
//   var ships = [2, 3, 3, 4, 5];
//
//   for (var i = 0; i < 5; i++) {
//     ships[i] = new Ship({ length: ships[i] });
//   };
//
//   return ships;
// };

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




















},{}],2:[function(require,module,exports){
window.BattleshipUI = BattleshipUI = function ($root, bs, socket) {
  this.$root = $root;
  this.bs = bs;
  this.click1;
  this.click2;
  this.$firstClicked;
  this.grids = this.createGrids();
  this.render();
  this.socket = socket;
	
  socket.on('CHANGE_STATE', this.changeState.bind(this));
  socket.on('SHOT', this.checkShot.bind(this));
  socket.on('RESPONSE', this.renderResponse.bind(this));
  socket.on('MESSAGE', this.displayMessage.bind(this));
	socket.on('WAITING_ROOM', this.renderWaitingRoom.bind(this));

  this.boom = new Audio('./resources/bomb.wav');
  this.splash = new Audio('./resources/splash.wav');
	
  $('.myShips .tile').on('click', this.handlePlace.bind(this));
  $('.myShots .tile').on('click', this.handleShot.bind(this));
  $('.message-form').on('submit', this.sendMessage.bind(this));
};

BattleshipUI.prototype.displayMessage = function (data) {
  console.log(data.id + " said: " + data.message);
  var $li = $("<li>").html(data.id + " said: " + data.message);

  $("ul").append($li);
};

BattleshipUI.prototype.renderWaitingRoom = function (data) {	
	var $target = $("ul.games");
	$target.empty();
	var socket = this.socket;
	
	var $playAI = $("<li><button id='AI'>play computer</button></li>");
	$target.append($playAI);
	
	$playAI.on('click', function () {
		socket.emit("COMPUTER_GAME", { id: socket.id } );
	});
	
	data.sockets.forEach(function (id) {
		if (id === socket.id) return;
		
		var $button = $("<li><button>" + id + "</button></li>");
		
		$button.on("click", function () {
			socket.emit("PLAYER_GAME", { id: id });
			$button.remove();
		});
		
		$target.append($button);
	});
};

BattleshipUI.prototype.sendMessage = function (event) {
	event.preventDefault();
  var message = $("#message").val();
  $("#message").val("");
  this.socket.emit("MESSAGE", {message: message, id: this.socket.id});
};

BattleshipUI.prototype.checkShot = function (data) {
  var result = this.bs.checkShot(data);
  var row = data.row;
  var col = data.col;
  var tile = this.grids[0][row][col];
  tile.html('&#9679;');

  if (result.hit) {
    this.socket.emit("HIT", data);
    tile.css('color','red');

    this.shakeBoard($(".myShips"));

    if (result.gameOver) {
      this.socket.emit("GAME_OVER", { winner: "me" });
    }
  } else {
    this.socket.emit("MISS", data);
    tile.css('color','white');
  }
};

BattleshipUI.prototype.shakeBoard = function (board) {
  board
    .animate({left:"50px", top: "-50px"}, 80)
    .animate({left: "-50px", top: "50px"}, 80)
    .animate({left:"35px", top: "35px"}, 80)
    .animate({left: "-35px", top: "-35px"}, 80)
    .animate({left:"15px", top: "-15px"}, 80)
    .animate({left: "-15px", top: "15px"}, 80)
    .animate({left:"5px", top: "-5px"}, 80)
    .animate({left: "-5px", top: "5px"}, 80)
    .animate({left: "0px", top: "0px"}, 80)

    $('body').toggleClass('red');
    setTimeout(function(){
      $('body').toggleClass('red');
    }, 1500);
};

BattleshipUI.prototype.renderResponse = function (data) {

  var row = data.row;
  var col = data.col;

  var tile = this.grids[1][row][col];

  if (data.response === 'hit') {
    this.boom.play();
  } else {
    this.splash.play();
  }

  tile.addClass(data.response);
  tile.removeClass("untouched");
};

BattleshipUI.prototype.changeState = function (data) {
  $(".status").html(data.state);
	var socket = this.socket;	
  this.bs.state = data.state;
};

BattleshipUI.prototype.createGrids = function () {
  var myShips = []
  var myShots = []

  for (var i = 0; i < 10; i++) {
    myShips.push([]);
    myShots.push([]);

    for (var j = 0; j < 10; j++) {
      var $tile = $("<div class='tile untouched' data-row='" + i + "' data-col='" + j + "'></div>");
      myShips[i].push($tile.clone());
      myShots[i].push($tile.clone());
    }
  }

  return [myShips, myShots];
};

BattleshipUI.prototype.render = function () {
  var $myShips = $('.myShips');
  var $myShots = $('.myShots');

  var myShips = this.grids[0];
  var myShots = this.grids[1];

  for (var i = 0; i < 10; i++) {
    var $shipRow = $("<div class='shipRow'></div>");
    var $shotRow = $("<div class='shotRow'></div>");
    myShips[i].forEach(function(tile){
      $shipRow.append(tile);
    });

    myShots[i].forEach(function(tile){
      $shotRow.append(tile);
    });

    $myShots.append($shotRow);
    $myShips.append($shipRow);
  }
  this.renderAvailable();
};

BattleshipUI.prototype.renderAvailable = function() {
  var $avail = $('.available')
  $avail.empty();
  this.bs.shipsToPlace.forEach(function(length) {
    var $ship = $("<div class='available-ship'></div>");
    for (var i = 0; i < length; i++) {
      $ship.append($("<div class='ship-tile'></div>"));
    }
    $avail.append($ship);
  });
}

BattleshipUI.prototype.handlePlace = function (e) {
  if (this.bs.state === "PLACE_SHIPS") {
    var that = this;

    if (typeof this.click1 === "undefined"){
      this.click1 = [$(e.target).data('row'), $(e.target).data('col')];

      this.$firstClicked = $(e.target);
      this.$firstClicked.addClass('selected');
      $(".myShips .tile").on("mouseover", this.placePreview.bind(this));
    } else {
      this.click2 = [$(e.target).data('row'), $(e.target).data('col')];
      this.$firstClicked.removeClass('selected');

      var segments = this.bs.placeShip(this.click1, this.click2);
			
      segments.forEach(function (segment) {
        var row = segment[0];
        var col = segment[1];

        $(that.grids[0][row][col]).addClass('ship');
      });

      if (segments.length > 0) {
        this.splash.play();
      }

      $(".tile").removeClass("highlight")
      $(".tile").off("mouseover");
      this.click1 = undefined;
      this.renderAvailable();
    }
		
    if (this.bs.shipsToPlace.length === 0) {
      this.socket.emit('SHIPS_PLACED');
    }
  }
};

BattleshipUI.prototype.placePreview = function (e) {
  $('.tile').removeClass('highlight');
  var prospect = [$(e.target).data('row'), $(e.target).data('col')];
  var highlights = coordsBetween(prospect, this.click1);
  var grid = this.grids[0];

  if (this.bs.shipsToPlace.indexOf(highlights.length) > -1 && this.bs.notTaken(highlights)) {
    highlights.forEach(function (highlight) {
      $(grid[highlight[0]][highlight[1]]).addClass('highlight');
    })
  }
}

BattleshipUI.prototype.handleShot = function (e) {
  if (this.bs.state === "SHOOT" && $(e.target).hasClass('untouched')) {
    var $bomb = $('<div class="bomb"></div>');
    var row = $(e.target).data('row');
    var col = $(e.target).data('col');
    var that = this;

    $(e.target).append($bomb);
    $bomb.animate({
      width: 0,
      height: 0,
      left: "10px",
      top: "10px"
    }, 750, function () {
      this.remove();
      that.socket.emit("SHOT", {col: col, row: row});
    });
  }
};

window.coordsBetween = function  (a, b) {
  var result = [];
  var length;
  var min;

  if (a[0] === b[0]) {

    length = Math.abs(a[1] - b[1]);
    min = Math.min(a[1], b[1]);

    for (var i = min; i <= length + min; i++) {
      result.push([a[0], i]);
    }
  } else if (a[1] === b[1]){
    length = Math.abs(a[0] - b[0]);
    min = Math.min(a[0], b[0]);

    for (var i = min; i <= length + min; i++) {
      result.push([i, a[1]]);
    }
  }

  return result;
};

},{}],3:[function(require,module,exports){
GameStates = {
  PLACE_SHIPS: 'PLACE_SHIPS',
  SHOOT: 'SHOOT',
  WAITING_FOR_OPPONENT: 'WAITING_FOR_OPPONENT',
  WAITING_FOR_OPPONENT_SHIPS: 'WAITING_FOR_OPPONENT_SHIPS'
};

},{}],4:[function(require,module,exports){
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

},{}]},{},[1,2,3,4]);
