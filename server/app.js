
var Promise = require('bluebird');
var express = require('express');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var methodOverride = require('method-override');
var mongoose = require('mongoose');
Promise.promisifyAll(require('mongoose'));


var routes = require('./routes');
var modules = require('./modules');

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
		resolve(mongoose);
	});
});

dbPromise.then(function(db) {

	// inject db instance to modules
	return modules(db);
})
.then(function(modules) {

	var app = express();
	var router = express.Router();

	app.use(bodyParser.json());
	app.use(methodOverride());

	app.use('/', router);

	routes(modules).connect(router);

	app.use(function(err, req, res, next) {
		res.status(400).json({
			error: err.message
		});
	});

	app.listen(config.port, function(){
		console.log('server started on port', config.port);
	});

});



