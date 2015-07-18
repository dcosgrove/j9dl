
module.exports = function(db, io, passport) {

	var inject = function(component) {
		return require(component)(db, io, passport);
	};

	return {
		users: inject('./users'),
		games: inject('./games')
	}
};