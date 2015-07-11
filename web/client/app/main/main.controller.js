'use strict';

angular.module('j9dl')
  .controller('MainCtrl', function ($scope, game, auth) {

  	// temporary disgusting poll until WS implemented
  	var pollingTime = 5000;

  	setInterval(function() {

  		if($scope.selectedGameId) {
  			loadSelectedGameDetails();
  		}
  		refreshGamesList();
  	}, pollingTime);

  	var setError = function(err) {
 		$scope.error = err;
 	};

 	var refreshGamesList = function() {
	 	game.list(function(games) {
	 		$scope.games = games;
	 	}, setError);
	};

	var clearOptions = function() {
		$scope.selectedGameId = null;
		$scope.selectedGame = null;
	};

	var reloadUser = function(done) {
	 	auth.getCurrentLogin(function(user) {
	  		$scope.user = user;
	  		
	  		if(done) {
	  			done();
	  		}
	  	}, function() {});
	};

	var tallyVotes = function(results, totalPlayers) {

		var tally = {
			A: 0,
			B: 0,
			scratch: 0
		};

		results.forEach(function(result) {
			tally[result.vote]++;

			if(tally[result.vote] > (totalPlayers / 2)) {
				tally.winner = result.vote;
			}
		});

		$scope.tally = tally;
	};

 	var loadSelectedGameDetails = function() {
 		game.getDetails($scope.selectedGameId)
 		.success(function(game) {
 			$scope.selectedGame = game;

 			if(game.results) {
 				tallyVotes(game.results, game.teamA.length + game.teamB.length);
 			}
 		})
 		.error(setError);
 	};	

 	var voteResult = function(vote) {
 		game.voteResult($scope.selectedGameId, vote)
 		.success(function() {
 			loadSelectedGameDetails();
 			refreshGamesList();
 		})
 		.error(setError);
 	};

 	// exposed scope functions
 	$scope.createGame = function() {
 		game.create(function() {
 			refreshGamesList();
 		}, setError);
 	};

 	$scope.selectGame = function(index) {
 		
 		$scope.selectedGameId = $scope.games[index]._id;

 		loadSelectedGameDetails();
 	};

 	$scope.joinGame = function() {
 		game.join($scope.selectedGameId)
 		.success(function() {
 			reloadUser(function() {
 				loadSelectedGameDetails();
 				refreshGamesList();
 			});
 		})
 		.error(setError);
 	};

 	$scope.cancelGame = function() {
 		game.cancel($scope.selectedGameId)
 		.success(function() {
 			clearOptions();
 			refreshGamesList();
 		})
 		.error(setError);
 	};

 	$scope.leaveGame = function() {
 		game.withdraw($scope.selectedGameId, $scope.user._id)
 		.success(function() {
 			reloadUser(function() {
 				loadSelectedGameDetails();
 				refreshGamesList();
 			});
 		})
 		.error(setError);
 	};

 	$scope.startGame = function() {

 		game.begin($scope.selectedGameId)
 		.success(function() {
 			loadSelectedGameDetails();
 			refreshGamesList();
 		})
 		.error(setError);
 	};

 	$scope.voteTeamA = function() {
 		voteResult('A');
 	};

	$scope.voteTeamB = function() {
 		voteResult('B');
 	};

 	$scope.voteVoid = function() {
 		voteResult('scratch');
 	};

 	// init
 	$scope.games = [];
 	refreshGamesList();
 	reloadUser();
  });
