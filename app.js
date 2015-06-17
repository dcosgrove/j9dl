
var Promise = require('bluebird');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
Promise.promisifyAll(require('mongoose'));

var config = {
	port: process.env.PORT || 8000,
	mongoUrl: 'mongodb://localhost:27017/j9dl'
};

mongoose.connect(config.mongoUrl);

var dbPromise = new Promise(function(resolve, reject) {

	mongoose.connection.on('error', function() {
		console.log('error connecting mongoose');
		reject();
	});

	mongoose.connection.once('open', function() {
		console.log('Mongoose connection established');
		global.db = mongoose;
		resolve();
	});
});

dbPromise.then(function() {

	var app = express();
	var router = express.Router();

	app.use('/', router);

	app.listen(config.port, function(){
		console.log('server started on port', config.port);
	});

});



