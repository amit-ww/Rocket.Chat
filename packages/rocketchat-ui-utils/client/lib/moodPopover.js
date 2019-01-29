import './moodPopover.html';
import { Meteor } from 'meteor/meteor';
import { Blaze } from 'meteor/blaze';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { isRtl, handleError } from 'meteor/rocketchat:utils';
import { ChatSubscription } from 'meteor/rocketchat:models';
import _ from 'underscore';
import { hide, leave } from './ChannelActions';
import { modal } from './modal';
import { messageBox } from './messageBox';
import { MessageAction } from './MessageAction';
import { RoomManager } from './RoomManager';
// import { Highcharts } from 'meteor/highcharts:highcharts-meteor';
//import Highcharts from 'highcharts'  --- this also didn't work

var Highcharts = require('highcharts');


export const moodPopover = {
	renderedPopover: null,
	open({ currentTarget, ...config }) {
		// Popover position must be computed as soon as possible, avoiding DOM changes over currentTarget
		const data = {
			targetRect: currentTarget && currentTarget.getBoundingClientRect && currentTarget.getBoundingClientRect(),
			...config,
		};
		this.renderedPopover = Blaze.renderWithData(Template.moodPopover, data, document.body);
	},
	close() {
		if (!this.renderedPopover) {
			return false;
		}

		Blaze.remove(this.renderedPopover);

		const { activeElement } = this.renderedPopover.dataVar.curValue;
		if (activeElement) {
			$(activeElement).removeClass('active');
		}
	},
};

Template.moodPopover.helpers({
  hasAction() {
    return !!this.action;
  },

  createChart: function () {
    // Gather data: 

    categories = [];
    seriesData = [];

    if(Meteor.user()){
      if(Meteor.user().mood_counter){
        _.forEach(Meteor.user().mood_counter, function(counter, mood){
          categories.push(mood.replace(/_/g, " "));
          seriesData.push(counter);
        });
      }

      // Use Meteor.defer() to craete chart after DOM is ready:
      Meteor.defer(function() {
        // Create standard Highcharts chart with options:
        Highcharts.chart('chart', {
          chart: {
            type: 'column'
          },
          title: {
            text: 'Mood Clicked Count'
          },
          xAxis: {
            categories: categories
          },
          yAxis: {
            title: {
              text: 'Count'
            }
          },
          series: [{
            name: Meteor.user().name,
            data: seriesData
          }]
        });
      });
    }
  }
});

Template.moodPopover.onRendered(function() {
  if (this.data.onRendered) {
    this.data.onRendered();
  }

  $('.rc-popover').click(function(e) {
    if (e.currentTarget === e.target) {
      moodPopover.close();
    }
  });
  const { offsetVertical = 0, offsetHorizontal = 0 } = this.data;
  const { activeElement } = this.data;
  const popoverContent = this.firstNode.children[0];
  const position = _.throttle(() => {

    const direction = typeof this.data.direction === 'function' ? this.data.direction() : this.data.direction;

    const verticalDirection = /top/.test(direction) ? 'top' : 'bottom';
    const rtlDirection = isRtl() ^ /inverted/.test(direction) ? 'left' : 'right';
    const rightDirection = /right/.test(direction) ? 'right' : rtlDirection;
    const horizontalDirection = /left/.test(direction) ? 'left' : rightDirection;

    const position = typeof this.data.position === 'function' ? this.data.position() : this.data.position;
    const customCSSProperties = typeof this.data.customCSSProperties === 'function' ? this.data.customCSSProperties() : this.data.customCSSProperties;

    const mousePosition = typeof this.data.mousePosition === 'function' ? this.data.mousePosition() : this.data.mousePosition || {
      x: this.data.targetRect[horizontalDirection === 'left' ? 'right' : 'left'],
      y: this.data.targetRect[verticalDirection],
    };
    const offsetWidth = offsetHorizontal * (horizontalDirection === 'left' ? 1 : -1);
    const offsetHeight = offsetVertical * (verticalDirection === 'bottom' ? 1 : -1);

    if (position) {
      popoverContent.style.top = `${ position.top }px`;
      popoverContent.style.left = `${ position.left }px`;
    } else {
      const clientHeight = this.data.targetRect.height;
      const popoverWidth = popoverContent.offsetWidth;
      const popoverHeight = popoverContent.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let top = mousePosition.y - clientHeight + offsetHeight;

      if (verticalDirection === 'top') {
        top = mousePosition.y - popoverHeight + offsetHeight;

        if (top < 0) {
          top = 10 + offsetHeight;
        }
      }

      if (top + popoverHeight > windowHeight) {
        top = windowHeight - 10 - popoverHeight - offsetHeight;
      }

      let left = mousePosition.x - popoverWidth + offsetWidth;

      if (horizontalDirection === 'right') {
        left = mousePosition.x + offsetWidth;
      }

      if (left + popoverWidth >= windowWidth) {
        left = mousePosition.x - popoverWidth + offsetWidth;
      }

      if (left <= 0) {
        left = mousePosition.x + offsetWidth;
      }

      popoverContent.style.top = `${ top }px`;
      popoverContent.style.left = `${ left }px`;
    }

    if (customCSSProperties) {
      Object.keys(customCSSProperties).forEach(function(property) {
        popoverContent.style[property] = customCSSProperties[property];
      });
    }

    const realTop = Number(popoverContent.style.top.replace('px', ''));
    if (realTop + popoverContent.offsetHeight > window.innerHeight) {
      popoverContent.style.overflow = 'scroll';
      popoverContent.style.bottom = 0;
      popoverContent.className = 'rc-popover__content rc-popover__content-scroll';
    }

    if (activeElement) {
      $(activeElement).addClass('active');
    }

    popoverContent.style.opacity = 1;
  }, 50);
  $(window).on('resize', position);
  position();
  this.position = position;

  this.firstNode.style.visibility = 'visible';
});

Template.moodPopover.onDestroyed(function() {
  if (this.data.onDestroyed) {
    this.data.onDestroyed();
  }
  $(window).off('resize', this.position);
});

Template.moodPopover.events({
  'click .js-action'(e, instance) {
    !this.action || this.action.call(this, e, instance.data.data);
    moodPopover.close();
  },
  'click .js-close'() {
    moodPopover.close();
  },
  'click [data-type="messagebox-action"]'(event, t) {
    const { id } = event.currentTarget.dataset;
    const action = messageBox.actions.getById(id);
    if ((action[0] != null ? action[0].action : undefined) != null) {
      action[0].action({ rid: t.data.data.rid, messageBox: document.querySelector('.rc-message-box'), element: event.currentTarget, event });
      if (id !== 'audio-message') {
        moodPopover.close();
      }
    }
  },
  'click [data-type="message-action"]'(e, t) {
    const button = MessageAction.getButtonById(e.currentTarget.dataset.id);
    if ((button != null ? button.action : undefined) != null) {
      button.action.call(t.data.data, e, t.data.instance);
      moodPopover.close();
      return false;
    }

    if (e.currentTarget.dataset.id === 'report-abuse') {
      const message = t.data.data._arguments[1];
      modal.open({
        title: TAPi18n.__('Report_this_message_question_mark'),
        text: message.msg,
        inputPlaceholder: TAPi18n.__('Why_do_you_want_to_report_question_mark'),
        type: 'input',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: TAPi18n.__('Report_exclamation_mark'),
        cancelButtonText: TAPi18n.__('Cancel'),
        closeOnConfirm: false,
        html: false,
      }, (inputValue) => {
        if (inputValue === false) {
          return false;
        }

        if (inputValue === '') {
          modal.showInputError(TAPi18n.__('You_need_to_write_something'));
          return false;
        }

        Meteor.call('reportMessage', message._id, inputValue);

        modal.open({
          title: TAPi18n.__('Report_sent'),
          text: TAPi18n.__('Thank_you_exclamation_mark '),
          type: 'success',
          timer: 1000,
          showConfirmButton: false,
        });
      });
      moodPopover.close();
    }
  },
  'click [data-type="sidebar-item"]'(e, instance) {
    moodPopover.close();
    const { rid, name, template } = instance.data.data;
    const action = e.currentTarget.dataset.id;

    if (action === 'hide') {
      hide(template, rid, name);
    }

    if (action === 'leave') {
      leave(template, rid, name);
    }

    if (action === 'read') {
      Meteor.call('readMessages', rid);
      return false;
    }

    if (action === 'unread') {
      Meteor.call('unreadMessages', null, rid, function(error) {
        if (error) {
          return handleError(error);
        }

        const subscription = ChatSubscription.findOne({ rid });
        if (subscription == null) {
          return;
        }
        RoomManager.close(subscription.t + subscription.name);

        FlowRouter.go('home');
      });

      return false;
    }

    if (action === 'favorite') {
      Meteor.call('toggleFavorite', rid, !$(e.currentTarget).hasClass('rc-popover__item--star-filled'), function(err) {
        moodPopover.close();
        if (err) {
          handleError(err);
        }
      });

      return false;
    }
  },
});

Template.moodPopover.helpers({
  isSafariIos: /iP(ad|hone|od).+Version\/[\d\.]+.*Safari/i.test(navigator.userAgent),
});


// Template.moodPopover.helpers({
// 	hasAction() {
// 		return !!this.action;
// 	},
// });

// function createHigh() { 
//     $('#container').highcharts({
//         chart: {
//             type: 'bar'
//         },
//         title: {
//             text: 'Mood Review'
//         },
//         xAxis: {
//             categories: ['Happy', 'Not-Happy', 'Confused', 'Sad']
//         },
//         yAxis: {
//             min:0,
//             title: {
//                 text: 'Counts'
//             }
//         },
//         series: [{
//             name: 'Jane',
//             data: [1, 0, 4]
//         }, {
//             name: 'John',
//             data: [5, 7, 3]
//         }]
//     });
// }

// Template.moodPopover.onCreated(function() {
// 	var self = this;
// 	self.autorun(function() {
// 		self.subscribe('someIrrelevantSub');
// 	});
// });

// Template.moodPopover.onRendered(function() {
// 	var self = this;
// 	self.autorun(function () {
// 		createHigh();
// 	});
// });

// Template.moodPopover.helpers({
// 	irrelevantHelper: function(){
// 		var x;
// 	}
// });
// Template.moodPopover.onDestroyed(function() {
// 	if (this.data.onDestroyed) {
// 		this.data.onDestroyed();
// 	}
// 	$(window).off('resize', this.position);
// });
