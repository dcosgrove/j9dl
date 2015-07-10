'use strict';

angular.module('j9dl')
.filter('ratingDisplay', function () {
	return function (input) {
	  return input * 40;
	};
});
