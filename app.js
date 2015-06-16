var express = require('express');
var app = express();

var config = {
	port: process.env.PORT || 8000
};

app.use('/', function(req, res, next) {
	res.json({
		j9dl: 'forthcoming'
	});
});

app.listen(config.port, function(){
	console.log('server started on port', config.port);
});
