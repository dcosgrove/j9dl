'use strict';

angular.module('j9dl')
.controller('LoginCtrl', function ($scope, $location, auth) {

	$scope.login = function() {
		auth.login($scope.form,
			function() {
				$location.path('/');
			}, function(err) {
				err = err.error ? err.error : err;
				$scope.error = 'Error: ' + err;
			});
	};
});
