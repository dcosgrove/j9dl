module.exports = function(modules) {

	// var authUser = modules.auth.authUser;
	// var authAdmin = modules.auth.authAdmin;
	// var authSelf = modules.auth.authSelf;
	
	return {
		connect: function(router) {
			router.post('/users', modules.users.create);
			router.get('/users', modules.users.list);
			router.get('/users/:id', modules.users.get);
		}
	}
}