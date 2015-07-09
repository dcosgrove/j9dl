'use strict';

angular.module('j9dl')
  .controller('NavbarCtrl', function ($scope, $location, auth) {
    $scope.menu = [{
      'title': 'Home',
      'link': '/'
    }];

    auth.getCurrentLogin(function(user) {
      $scope.user = user;
      $scope.notLoggedIn = false;
    }, function() {
      $scope.notLoggedIn = true;
      console.log('no user session found');
    });

    $scope.isCollapsed = true;

    $scope.isActive = function(route) {
      return route === $location.path();
    };

    $scope.logout = function() {

      $scope.user = null;
      $scope.notLoggedIn = true;

      auth.logout(function() {
        $location.path('/'); 
      });
    };

  });