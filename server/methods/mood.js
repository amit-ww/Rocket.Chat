import { Meteor } from 'meteor/meteor';

Meteor.methods({

	moodCounter: function(moodType) {
        let counter = 0;
        let user = Meteor.users.findOne({ _id: Meteor.userId() });
        if(user){
            let mood_counter = {
                'happy': 0,
                'not_happy': 0,
                'confused': 0,
                'sad': 0
            };

            Object.assign(mood_counter, user.mood_counter);

            mood_counter[moodType] = mood_counter[moodType] + 1;

            Meteor.users.update(Meteor.userId(), {
                $set: {
                    mood_counter: mood_counter
                }
            });
        }
	},
});
