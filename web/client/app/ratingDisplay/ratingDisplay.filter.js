'use strict';

angular.module('j9dl')
.filter('ratingDisplay', function () {
	return function (input) {
	  return Math.round(input * 40);
	};
});
