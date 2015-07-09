'use strict';

describe('Service: game', function () {

  // load the service's module
  beforeEach(module('webApp'));

  // instantiate service
  var game;
  beforeEach(inject(function (_game_) {
    game = _game_;
  }));

  it('should do something', function () {
    expect(!!game).toBe(true);
  });

});
