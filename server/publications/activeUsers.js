import { Meteor } from 'meteor/meteor';

Meteor.publish('activeUsers', function() {
	if (!this.userId) {
		return this.ready();
	}

	return RocketChat.models.Users.findUsersNotOffline({
		fields: {
			username: 1,
			name: 1,
			status: 1,
			utcOffset: 1,
			mood_counter: 1
		},
	});
});
