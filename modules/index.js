
module.exports = function(db) {

	var inject = function(component) {
		return require(component)(db);
	};

	return {
		users: inject('./users')
	}
};