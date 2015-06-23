
module.exports = function(db, io) {

	var inject = function(component) {
		return require(component)(db, io);
	};

	return {
		users: inject('./users'),
		games: inject('./games')
	}
};