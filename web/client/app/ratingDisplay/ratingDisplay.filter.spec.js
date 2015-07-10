'use strict';

describe('Filter: ratingDisplay', function () {

  // load the filter's module
  beforeEach(module('j9dl'));

  // initialize a new instance of the filter before each test
  var ratingDisplay;
  beforeEach(inject(function ($filter) {
    ratingDisplay = $filter('ratingDisplay');
  }));

  it('display the rating x 40', function () {
    var rating = 25;
    expect(ratingDisplay(rating)).toBe(1000);
  });

});
