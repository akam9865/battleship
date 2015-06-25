var waitingUsers = {};
var usernames = {};
var rooms = {};
var io;

function createGameServer (server) {
  io = require('socket.io')(server);

  io.on('connection', function (socket) {
    waitingUsers[socket.id] = socket;
		usernames[socket.id] = 'human';
		
		socket.emit("CHANGE_STATE", { state: "WAITING_FOR_OPPONENT" });

		io.emit("WAITING_ROOM", { sockets: Object.keys( waitingUsers ), usernames: usernames });

		socket.on("COMPUTER_GAME", function (data) {
			createAIGame(waitingUsers[ data.id ], data.level, data.name);

			delete waitingUsers[data.id];
			io.emit("WAITING_ROOM", { sockets: Object.keys( waitingUsers ), usernames: usernames });
		});
		
		socket.on("NAME_FLEET", function (data) {
			usernames[socket.id] = data.fleetName;
			io.emit("WAITING_ROOM", { sockets: Object.keys( waitingUsers ), usernames: usernames });
		});

		socket.on("PLAYER_GAME", function (data) {
			var p1 = waitingUsers[socket.id];
			var p2 = waitingUsers[data.id];

			createPlayerGame([ p1, p2 ]);

			delete waitingUsers[socket.id];
			delete waitingUsers[data.id];

			io.emit("WAITING_ROOM", { sockets: Object.keys( waitingUsers ), usernames: usernames });
		})

		socket.on("disconnect", function () {
			delete waitingUsers[socket.id];
			io.emit("WAITING_ROOM", { sockets: Object.keys(waitingUsers), usernames: usernames });
		});

    socket.on("MESSAGE", function (data) {
			data.username = usernames[data.id];
      io.to(rooms[data.id]).emit("MESSAGE", data);
    });
  });
};

function createPlayerGame (users) {
  var game = {
    name: 'game ' + users[0].id,
    players: users
  }
  var waitingForShips = users;

  users.forEach(function (user) {
    joinRoom(user, game.name);
    user.emit('CHANGE_STATE', { state: "PLACE_SHIPS" });

    user.on('SHIPS_PLACED', function() {
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


function createAIGame (user, level, name) {
	console.log('created game vs. ' + name);
	
	var ai = new AIGame(level);
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
				
				user.emit('SHOT', ai.shot());
			}, 800);
		}
	});
	
	user.on('HIT', function (data) {
		ai.updateTargets(data);
	});
	
	user.on('GAME_OVER', function () {
		user.emit('CHANGE_STATE', { state: "LOSER" });
	});
	
  user.on("MESSAGE", function (data) {
    user.emit("MESSAGE", data);
		setTimeout(function () {
			user.emit("MESSAGE", {username: name, message: "I'm afraid I can't do that"});
		}, 1000);
  })
};


function setupGrid (tiles) {
	var grid = [];

	for (var i = 0; i < 10; i++) {
		if (tiles) {
			grid.push([]);
			
			for (var j = 0; j < 10; j++) {
				grid[i].push(new Tile(i, j));
			}
		} else {			
			grid.push([0,0,0,0,0,0,0,0,0,0]);
		}
		
	}
	
	return grid;
};

function randomShip (len) {
	var increment, dRow, dCol, last, next;
	
	if (Math.random() < 0.5) {
		increment = [1, 0];
		dRow = len - 1;
		dCol = 0;
	} else {
		increment = [0, 1];
		dRow = 0;
		dCol = len - 1;
	}
	
	var row = Math.floor(Math.random() * (10 - dRow));
	var col = Math.floor(Math.random() * (10 - dCol));
	var segments = [ [row, col] ];

	for (var i = 1; i < len; i++) {
		last = segments[segments.length - 1];
		next = [ last[0] + increment[0], last[1] + increment[1] ];
		segments.push(next);
	}

	return segments;
};

var AIGame = function (level) {
	this.level = level;
	this.shipsGrid = setupGrid();
	this.shotsGrid = setupGrid(true);
	
	this.targets = [];
	this.shots = [];

	for (var i = 0; i < 100; i++) {		
		this.shots.push(i);
	};
	
	this.hits = 0;
};

AIGame.prototype = {
	placeShips: function () {
		var toPlace = [2, 3, 3, 4, 5];
		var current, conflict;

		while (toPlace.length > 0) {
			conflict = false;

			current = toPlace[0];
			var ship = randomShip(current);

			ship.forEach( function (c) {
				if (this.shipsGrid[c[0]][c[1]]) conflict = true;
			}.bind(this));

			if (!conflict) {
				ship.forEach( function (c) {
					this.shipsGrid[c[0]][c[1]] = current;
				}.bind(this));

				toPlace.shift();
			}
		}
	},
	
	randomShot: function () {
		var len = this.shots.length;
		var idx = Math.floor(Math.random() * len);
		
		var row = Math.floor(this.shots[idx] / 10);
		var col = this.shots[idx] % 10;

		this.shots.splice(idx, 1);
		this.shotsGrid[row][col].explored = true;
		
		return { row: row, col: col };
	},
	
	shot: function () {
		if (this.level === 'easy') return this.randomShot();
		
		if (this.targets.length) {
			var target = this.targets.pop();
			var shot = target.row * 10 + target.col;

			this.shots.splice(this.shots.indexOf(shot), 1);

			this.shotsGrid[target.row][target.col].explored = true;
			return target;
		} else {
			return this.randomShot();
		}
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
	},
	
	updateTargets: function (data) {
		var tile = this.shotsGrid[data.row][data.col];

		tile.neighbors().forEach(function (neighbor) {
			var row = neighbor[0];
			var col = neighbor[1];
			var tile = this.shotsGrid[row][col];

			if (!tile.explored) this.targets.push({ row: row, col: col });
		}.bind(this));
	}
};

function Tile (row, col) {
	this.row = row;
	this.col = col;
	
	this.explored = false;
};

Tile.prototype = {
	neighbors: function () {
		var res = [];
		var difs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
		
		for (var i = 0; i < 4; i++) {
			var row = difs[i][0] + this.row;
			var col = difs[i][1] + this.col;
			
			if ( onBoard(row, col) ) res.push([row, col]);
		}
		
		return res;
	}
};

function onBoard (row, col) {
	return (
		row <= 9 && row >= 0 && col >= 0 && col <= 9
	);
};

exports.createGameServer = createGameServer;
