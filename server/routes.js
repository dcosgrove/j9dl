module.exports = function(modules) {
	
	return {
		connect: function(router) {

			router.post('/login', modules.users.login);
			router.get('/logout', modules.users.logout);
			router.post('/users', modules.users.create);
			router.get('/users', modules.users.list);
			router.get('/users/:id', modules.users.get);

			router.post('/games', modules.games.create);
			router.get('/games', modules.games.list);
			router.get('/games/:id', modules.games.get);

			router.post('/games/:id/begin', modules.games.begin);
			router.post('/games/:id/result', modules.games.result);

			router.post('/games/:id/players', modules.games.join);
			router.delete('/games/:id/players/:user', modules.games.withdraw);
			router.delete('/games/:id', modules.games.abort);
		}
	}
}