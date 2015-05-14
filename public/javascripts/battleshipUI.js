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


  this.boom = new Audio('./resources/bomb.wav');
  this.splash = new Audio('./resources/splash.wav');
  $('.myShips .tile').on('click', this.handlePlace.bind(this));
  $('.myShots .tile').on('click', this.handleShot.bind(this));
};

BattleshipUI.prototype.checkShot = function (data) {

  var result = this.bs.checkShot(data);
  console.log(result);
  var row = data.row;
  var col = data.col;
  var tile = this.grids[0][row][col];
  tile.html('&#9679;');
  if (result.hit) {
    this.socket.emit("HIT", data);
    tile.css('color','red');
    if (result.gameOver) {
      this.socket.emit("GAME_OVER", {winner: "me"});
    }
  } else {
    this.socket.emit("MISS", data);
    tile.css('color','white');
  }
};

BattleshipUI.prototype.renderResponse = function (data) {

  var row = data.row;
  var col = data.col;

  var tile = this.grids[1][row][col];

  tile.addClass(data.response);
  console.log(tile);
  console.log(data);

};

BattleshipUI.prototype.changeState = function (data) {
  console.log(data.state);
  this.bs.state = data.state;
}

BattleshipUI.prototype.createGrids = function () {
  var myShips = []
  var myShots = []

  for (var i = 0; i < 10; i++) {
    myShips.push([]);
    myShots.push([]);

    for (var j = 0; j < 10; j++) {
      var $tile = $("<div class='tile' data-row='" + i + "' data-col='" + j + "'></div>");

      myShips[i].push($tile.clone());
      myShots[i].push($tile.clone());
    }
  }

  return [myShips, myShots];
}

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

      var segments = this.bs.placeShip({front: this.click1, back: this.click2});
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
  if (this.bs.state === "SHOOT") {
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
    }, 750, function(){
      this.remove();
      that.boom.play();


      // $(e.target).addClass('hit');
      // or
      // $(e.target).addClass('miss');
    });

    this.socket.emit("SHOT", {col: col, row: row});
    // alert("row: " + row + ", col: " + col);
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
