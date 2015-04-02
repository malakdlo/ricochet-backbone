window.scoreModel = Backbone.Model.extend({
	defaults : {
		tokensRemaining: [],
		targetToken: undefined,
		timerValue : 60,
		timeRemaining: true,
		bidQueue : [],
		activePlayer : undefined,
		activeBid: undefined,
		activeMoves : 0,
		interval: undefined,
		startTimerFn: function(){
			if(this.get('timerValue') === 60){
				this.set('interval', setInterval(function(){
					this.set('timerValue',
						this.get('timerValue')-1);
				}.bind(this)
					,1000)
				);			
			}

			var checkInterval = setInterval(function(){
				if (this.get('timerValue') <= 0){
					clearInterval(this.get('interval'));
					this.trigger('timeUp');
					clearInterval(checkInterval);
					this.set('timerValue', 0);
				}
			}.bind(this), 1000);
		},
		bidCounter: 0
	},
	incrementBidCounter : function(){
		console.log('adding bids :');
		this.set('bidCounter', this.get('bidCounter')+1);
		console.log('new bid #: ', this.get('bidCounter'));
	},
	initialize: function(){
		Backbone.Events.on('newBidEvent', this.incrementBidCounter, this);
		Backbone.Events.on('robotMoved', this.robotMoved, this)
		Backbone.Events.on('robotArrived', this.robotArrived, this)

		this.on('change:timerValue', this.checkTimer, this);
		Backbone.Events.on('skipTimer', this.skipTimer, this);

		this.on('endRound', this.newRound, this);
		Backbone.Events.on('newGame', this.newRound, this);

		this.on('timeUp', this.timeUp, this);
		Backbone.Events.on('newBid', this.handleIncomingBid, this);

		this.on('change:targetToken', this.drawCenter, this);

		this.on('successRound failRound endRound newGame', this.resetActive, this);
		this.on('successRound', this.activeSuccess, this);
		this.on('failRound', this.activeFail, this);

		this.timerReset(this)
	},
	resetActive: function(){
		this.set('activePlayer', undefined);
	},
	robotMoved: function(){
		//increment active moves.
		//if active moves over latest bid, trigger fail event
		console.log('nawp.');
		this.set('activeMoves', this.get('activeMoves')+1);
		if (this.get('activeMoves') >= this.get('activeBid').value ){
			this.trigger('failRound', [this.get('activeBid')]);
		}
	},
	robotArrived: function(){
		//if active moves under or equal to latest bid, trigger success event
		//omg, Note to self: trigger can pass event callbacks. This changes things!
		//Can refactor a lot of events into groups..
		this.trigger('successRound', [this.get('activeBid')]);

	},
	activeSuccess: function(bid){
		var bid = bid[0]
		var triggerEnd = function(){
			this.trigger('endRound');
		}.bind(this)
		//assign token object to active bid.player
		bid.playerModel.addPoint(this.get('targetToken'));
		vex.dialog.open({
			message: bid.username + ' wins a point!',
			buttons: [
			  $.extend({}, vex.dialog.buttons.YES, {
			    text: 'Sweet!'
			})],
			callback: triggerEnd
		});

		//Note, this event, which is simply adding a token to playerModel, could be a responded to inside playerModel..
		//it's just points...but would need Backbone to be 
	},
	activeFail: function(bid){
		var bid = bid[0]
		vex.dialog.open({
			message: bid.username + ' failed!',
			callback: function(){
				failRound();
			}
		});
		var failRound = function(){
			var playerTokens = bid.playerModel.get('tokensWon');
			if (playerTokens.length > 0){
				this.get('tokensRemaining').push(bid.playerModel.removePoint());
				this.trigger('change:tokensRemaining')
			}
			//decrement active players' points to min 0
			//if length >0
			//randomly select a token from active player's array of won tokens, 
			//	return them to remainingTokens
			//
			//dequeue bid, or make sure it's discarded
			//if more bids, updateActive, keep playing
			//if no more bids, re-insert the current token to remaining tokens
			if (this.get('bidQueue').length > 0){
				Backbone.Events.trigger('resetPosition');
				this.requestMove();
			} else {
				this.get('tokensRemaining').push(this.get('targetToken'));
				Backbone.Events.trigger('resetPosition');
				this.trigger('endRound');
			}
			this.shuffleTokens();
			//shuffle the tokens
			//trigger endRound
			// this.trigger('endRound');			
		}.bind(this);
	},
	newRound: function(test){
		var runRound = function(){
			Backbone.Events.trigger('roundStart');
			this.set('bidQueue', []);
			this.set('activeBid', undefined);
			this.set('activeMoves', 0); //this could be more modular, resetting functions
			//can be separate from the new token assignment functions
			////See activeMoves on 134 (and all other instances of activeMoves)

			//remove token from tokenPool, trigger a new token so canvasDrawView 
			var remTokens = this.get('tokensRemaining')
			if (remTokens.length === 0){
				vex.dialog.open({
					message:  "Someone (calculate winner)" + " wins!"
				});
			} else {
				this.set('targetToken', remTokens.shift());
				this.timerReset(this);
			}
		}.bind(this);

		if (test){
			runRound();
		}else{
			vex.dialog.open({
				message: 'New Round! Ready for the next round?',
				buttons: [
				  $.extend({}, vex.dialog.buttons.YES, {
				    text: 'GO!'
				  })
				],
				callback: function() {
					runRound();
				}
			});		
		}
	},
	addToken: function(newToken){
		var tokens = this.get('tokensRemaining')
		tokens.push(newToken);
		if(this.get('tokensRemaining').length === 16){
			console.log(this.get('tokensRemaining').length);
			this.shuffleTokens();
		}
	},
	drawCenter: function(){
		var target = this.get('targetToken');
		var grid = {
			context	: boardDetails.getContext(),
			box 	: boardDetails.getWidthAndSize(),
			grid	: boardDetails
		};
		grid.grid.drawShape(
			grid.context, 
			grid.box.bsize, 
			undefined, 
			undefined,
			target.color,
			target.shape,
			true);
	},
	shuffleTokens: function(){
		this.get('tokensRemaining').sort(function(){return Math.random()-0.5;});
	},
	timerReset : function(ctx){
		ctx.set('timerValue', 60);
		ctx.startTimer = _.once(this.get('startTimerFn').bind(this));
		ctx.set('timeRemaining', false);

	},
	skipTimer: function(){
		this.set('timerValue', 0);
	},
	checkTimer: function(){
		if (this.get('timerValue') === 0){
			if(this.get('timeRemaining')){
				this.trigger('timeUp');
				this.set('timeRemaining', false);
			}
		}
	},
	requestMove: function(){
		var activeBid = this.get('bidQueue').shift();
		this.set('activeMoves', 0);
		this.set('activeBid', activeBid);
		this.set('activePlayer', activeBid.username);
		vex.dialog.open({
			message: 'Your move, ' + activeBid.username + '.  Your bid is '+ activeBid.value + ' moves.'
		});
		//render the board so that a player knows when they're active
		//assign a listener...for winning. remove that listener when needed.
	},
	timeUp: function(){
		//collate bids.
		//requestMove....
		this.collateBids();
		this.requestMove();
	},
	updateActive: function(){
		//(Currently not used, might be a good idea for a refactor)
		//takes the first element of the queue, assigns the owner of that bid to 'active player'
	},
	collateBids: function(){
		//uses createNewBid to take all the bid numbers, and order the players into the queue
		//use rootModel.collection...get all the bids
		var players = rootModel.get('players');
		var bids = [];
		players.each(function(player, idx){
			if(player.get('currentBid') !== 'none'){
				var newBid = this.createNewBid(player);
				bids.push(newBid);				
			}
		}.bind(this));
		bids.sort(function(bid1, bid2){
			if(bid1.value === bid2.value){
				return bid1.order - bid2.order;
			}
			return bid1.value - bid2.value;
		})
		this.set('bidQueue', bids);
	},
	createNewBid: function(player){
		//creates a new bid object with the bid, and a reference to the player that made it
		return {
			username 	: player.get('username'),
			value 		: player.get('currentBid').moves,
			playerModel : player,
			order		: player.get('currentBid').bidNumber
		};
	},
	dequeueBid: function(){
		//pop off a bid from the queue, return object
	},
	clearQueue: function(){
		this.set('bidQueue', []);
	},
	handleIncomingBid: function(){
		//This WHOLE FUNCTION MAY NOT BE NECESSARY; it only starts the timer **
		//responding to a new bid trigger event;
		var x = $('.bidfield > input');
		if (!this.get('activePlayer')){
			this.startTimer();
		}
	}
});