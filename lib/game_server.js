var waitingUsers = {};
var rooms = {};
var io;

function createGameServer (server) {
  io = require('socket.io')(server);

  console.log('game server');
  io.on('connection', function (socket) {
    waitingUsers[socket.id] = socket;
		
		socket.emit("CHANGE_STATE", { state: "WAITING_FOR_OPPONENT" });
		
		io.emit("WAITING_ROOM", { sockets: Object.keys( waitingUsers ) });
		
		socket.on("COMPUTER_GAME", function (data) {
			createAIGame(waitingUsers[ data.id ]);

			delete waitingUsers[data.id];
			io.emit("WAITING_ROOM", { sockets: Object.keys( waitingUsers ) });
		});
		
		socket.on("PLAYER_GAME", function (data) {
			var p1 = waitingUsers[socket.id];
			var p2 = waitingUsers[data.id];
			
			createPlayerGame([ p1, p2 ]);
			
			delete waitingUsers[socket.id];
			delete waitingUsers[data.id];
			io.emit("WAITING_ROOM", { sockets: Object.keys( waitingUsers ) });
		})
		
		socket.on("disconnect", function () {
			delete waitingUsers[socket.id];
			io.emit("WAITING_ROOM", { sockets: Object.keys(waitingUsers) });
		});

    socket.on("MESSAGE", function (data) {
      io.to(rooms[data.id]).emit("MESSAGE", data);
    });
  })
};

function createPlayerGame (users) {
  var game = {
    name: 'game ' + users[0].id,
    players: users
  }

  var waitingForShips = users;
  console.log('created game');

  users.forEach(function (user) {
    joinRoom(user, game.name);
    user.emit('CHANGE_STATE', { state: "PLACE_SHIPS" });

    user.on('SHIPS_PLACED', function() {
      console.log("ships have been placed");
      waitingForShips.splice(waitingForShips.indexOf(user),1);
      if (waitingForShips.length === 1) {
        user.emit('CHANGE_STATE', { state: 'WAITING_FOR_OPPONENT_SHIPS' });
      } else {
        user.emit('CHANGE_STATE', { state: 'SHOOT' });
      }
    });

    var shootAt;
    if (game.players[0] === user) {
      shootAt = game.players[1];
    } else {
      shootAt = game.players[0];
    }

    user.on('SHOT', function (data) {
      shootAt.emit('SHOT', data);
      shootAt.emit('CHANGE_STATE', {state: 'SHOOT'});

      user.emit('CHANGE_STATE', {state: 'WAITING_TO_SHOOT'});
    });

    user.on('HIT', function (data) {
      data['response'] = 'hit';
      shootAt.emit('RESPONSE', data);
    });

    user.on('MISS', function (data) {
      data['response'] = 'miss';
      shootAt.emit('RESPONSE', data);
    });

    user.on('GAME_OVER', function(){
      shootAt.emit('CHANGE_STATE', {state: 'WINNER'});
      user.emit('CHANGE_STATE', {state:'LOSER'});
    });
  });
};


function joinRoom (socket, room) {
  var oldRoom = rooms[socket.id];
  socket.leave(oldRoom);
  socket.join(room);

  rooms[socket.id] = room;
};


function createAIGame (user) {
	console.log('created game vs. AI');
	var ai = new AIGame();
	ai.placeShips();
	user.emit('CHANGE_STATE', { state: "PLACE_SHIPS" });
	user.on('SHIPS_PLACED', function () {
		ai.placeShips();
		user.emit('CHANGE_STATE', { state: "SHOOT" });
	});
	
	user.on('SHOT', function (data) {
		user.emit('CHANGE_STATE', { state: "Waiting for AI shot" });
		
		data['response'] = ai.receiveShot(data);
		user.emit('RESPONSE', data);
		
		if (ai.gameover()) {
			user.emit('CHANGE_STATE', { state: "WINNER" })
		} else {
			// AI shoot at user
			setTimeout(function () {
				user.emit('CHANGE_STATE', { state: "SHOOT" });
				user.emit('SHOT', ai.randomShot());
			}, 1500);
		}
	});
	
	user.on('GAME_OVER', function () {
		console.log('server side over')
		user.emit('CHANGE_STATE', { state: "LOSER" });
	});
	
  user.on("MESSAGE", function (data) {
    console.log(data.message);
    user.emit("MESSAGE", data);
		setTimeout(function () {
			user.emit("MESSAGE", {id: "HAL", message: "I'm afraid I can't do that"});
		}, 500);
  })
};


function setupGrid () {
	var grid = [];
	
	for (var i = 0; i < 10; i++) {
		grid.push([0,0,0,0,0,0,0,0,0,0]);
	}
	
	return grid;
};

function randomShip (len) {
	var increment, dRow, dCol
	
	if (Math.random() < 0.5) {
		increment = [1, 0];
		dRow = len - 1;
		dCol = 0
	} else {
		increment = [0, 1];
		dRow = 0;
		dCol = len - 1;
	}
	
	var row = Math.floor(Math.random() * (10 - dRow));
	var col = Math.floor(Math.random() * (10 - dCol));
	var segments = [ [row, col] ];

	for (var i = 1; i < len; i++) {
		var last = segments[segments.length - 1];
		var next = [ last[0] + increment[0], last[1] + increment[1] ]
		segments.push(next);
	}
	
	return segments;
};

var AIGame = function () {
	this.shipsGrid = setupGrid();
	this.shotsGrid = setupGrid();
	
	this.hits = 0;
};

AIGame.prototype = {
	placeShips: function () {
		var toPlace = [2, 3, 3, 4, 5];
		var current;
		
		while (toPlace.length > 0) {
			var conflict = false;
			
			current = toPlace[0];
			var ship = randomShip(current);
			
			ship.forEach(function (c) {
				if (this.shipsGrid[c[0]][c[1]]) conflict = true;
			}.bind(this));
			
			if (!conflict) {
				ship.forEach(function (c) {
					this.shipsGrid[c[0]][c[1]] = 1;
				}.bind(this));
				toPlace.shift();
			}
		}
	},
	
	randomShot: function () {
		// works but a bad algorithm.
		do {
			var row = Math.floor(Math.random() * 10);
			var col = Math.floor(Math.random() * 10);
		} while ( this.shotsGrid[row][col] );
		
		this.shotsGrid[row][col] = 1;
		
		return { row: row, col: col };
	},
	
	receiveShot: function (coord) {
		var result;
		
		if ( this.shipsGrid[coord.row][coord.col] ) {
			this.hits++;
			result = "hit";
		} else {
			result = "miss";
		}
		
		return result;
	},
	
	gameover: function () {
		return this.hits === 17;
	}
};

exports.createGameServer = createGameServer;
