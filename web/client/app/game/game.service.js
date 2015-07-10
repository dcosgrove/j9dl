'use strict';

angular.module('j9dl')
.factory('game', function ($http) {

  var getGamesList = function(success, error) {
    return $http.get('api/games')
    .success(function(games) {

      // TODO - filter intelligently
      console.log('games', games);
      success(games);
    })
    .error(error);
  };

  // Public API here
  return {
    list: function (success, error) {
      return getGamesList(success, error);
    },

    create: function(success, error) {
      return $http.post('api/games', { mode: 'SG' })
      .success(success)
      .error(error);
    },

    getDetails: function(id) {
      return $http.get('api/games/' + id);
    },

    cancel: function(id) {
      return $http.delete('api/games/' + id);
    },

    join: function(id) {
      return $http.post('api/games/' + id + '/players');
    },

    withdraw: function(game, player) {
      return $http.delete('api/games/' + game + '/players/' + player);
    },

    begin: function(id) {
      return $http.post('api/games/' + id + '/begin');
    },

    voteResult: function(game, vote) {
      return $http.post('api/games/' + game + '/result', { vote: vote });
    }
  };
});
