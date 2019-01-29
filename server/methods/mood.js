import { Meteor } from 'meteor/meteor';

Meteor.methods({
	moodCounter: function(moodType) {
		const user = Meteor.users.findOne({ _id: Meteor.userId() });

		if (user){
			const mood_counter = {
				"happy": 0,
				"not_happy": 0,
				"confused": 0,
				"sad": 0
			};

			Object.assign(mood_counter, user.mood_counter);

			mood_counter[moodType] = (mood_counter[moodType] || 0) + 1;

			Meteor.users.update(Meteor.userId(), {
				$set: {
					mood_counter: mood_counter,
				},
			});
		}
	},
});
