'use strict';

angular.module('j9dl')
.controller('RegisterCtrl', function ($scope, $location, auth) {
	
	$scope.register = function() {
		auth.register($scope.form,
			function() {
				$location.path('/');
			}, function(err) {
				err = err.error ? err.error : err;
				$scope.error = 'Error: ' + err;
			});
	};
});
