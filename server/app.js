
var Promise = require('bluebird');
var express = require('express');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var methodOverride = require('method-override');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');
Promise.promisifyAll(require('mongoose'));

var sio = require('socket.io')

var routes = require('./routes');
var modules = require('./modules');

var config = {
	port: process.env.PORT || 8000,
	mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/j9dl'
};

mongoose.connect(config.mongoUrl);

var dbPromise = new Promise(function(resolve, reject) {

	mongoose.connection.on('error', function(err) {
		console.log('error connecting mongoose');
		reject(err);
	});

	mongoose.connection.once('open', function() {
		console.log('Mongoose connection established');
		resolve(mongoose);
	});
});

dbPromise.then(function(db) {

	var app = express();

	var server = require('http').createServer(app);

	var io = sio(server);

	io.on('connection', function(socket) {

		console.log('client connected');
		socket.on('disconnect', function() {
			console.log('disconnected');
		})
	});
		
	// inject db instance to modules
	return [ modules(db, io), app, server ];
})
.spread(function(modules, app, server) {

	app.use(session({
		secret: 'vlv',
		store: new MongoStore({ mongooseConnection: mongoose.connection })
	}));

	app.use(bodyParser.json());
	app.use(methodOverride());

	var router = express.Router();
	app.use('/', router);

	routes(modules).connect(router);

	app.use(function(err, req, res, next) {
		res.status(400).json({
			error: err.message
		});
	});

	server.listen(config.port, function() {
		console.log('server started on port', config.port);
	});
});



