'use strict';

angular.module('j9dl')
  .controller('MainCtrl', function ($scope, game, auth) {

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

 	var loadSelectedGameDetails = function() {
 		game.getDetails($scope.selectedGameId)
 		.success(function(game) {
 			$scope.selectedGame = game;
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
 			});
 		})
 		.error(setError);
 	};

 	var setError = function(err) {
 		$scope.error = err;
 	};

 	// init
 	$scope.games = [];
 	refreshGamesList();
 	reloadUser();
  });
