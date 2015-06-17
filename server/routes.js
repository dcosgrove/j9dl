module.exports = function(modules) {

	// var authUser = modules.auth.authUser;
	// var authAdmin = modules.auth.authAdmin;
	// var authSelf = modules.auth.authSelf;
	
	return {
		connect: function(router) {

			router.post('/login', modules.users.login);
			router.get('/logout', modules.users.logout);
			router.post('/users', modules.users.create);
			router.get('/users', modules.users.list);
			router.get('/users/:id', modules.users.get);
		}
	}
}