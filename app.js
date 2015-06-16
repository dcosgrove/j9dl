


var express = require('express');
var app = express();


var config = {
	port: 8005
};

//app.use('/', router);

// routes.connect(router);

app.listen(config.port, function(){
	logger.success({
		message: 'server started on port ' + config.port
	});
});
