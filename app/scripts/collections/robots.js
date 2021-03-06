window.robots = Backbone.Collection.extend({
	model: robotModel,
	initialize: function(){
		Backbone.Events.on('robotLocChange', function(){
			//This is an incomplete change. See issue #6.
			this.forEach(function(value, key, list){
				value.set('lastMoveDir', undefined);
			});
		}, this);
		Backbone.Events.on('resetPosition', function(){
			//loop through array, move the robots back to their roundStart positions
			this.forEach(function(value, key){
				value.resetPosition();
			})
		}, this);
		Backbone.Events.on('roundStart', function(){
			//loop through the array, 
			//	save the current location of robots
			this.forEach(function(value, key){
				value.saveStartingPosition();
			})
		}, this);
	},
	/**
	 * [Returns a boolean, true if the input square matches the location of a robot in collection]
	 * @param  {[obj]} square [has row and col properties]
	 * @return {[type]}        [description]
	 */
	squareHasConflict : function(square){
		var foundConflict = false;
		this.forEach(function(val){
			var loc = val.get('loc');
			if (loc.row === square.row && loc.col === square.col){
				foundConflict = true;
			}
		});
		return foundConflict;
	}
});