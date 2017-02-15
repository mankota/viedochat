import { Component, ViewChild } from '@angular/core';
import { Platform, NavController, Nav , ViewController, Events } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';
import { ChatsPage } from '../pages';
import { CallService } from '../services';
import { CallModalTrigger } from '../components';


import * as moment from 'moment';
//import * as locales from 'moment/min/locales';

declare var cordova:any;


@Component({
	templateUrl: 'app.html'
})
export class MyApp {
	rootPage = ChatsPage;
	isInCall = false

	constructor(platform: Platform, callService: CallService, events: Events, callModal: CallModalTrigger) {


		// format chat date diffs
		moment.locale('en', {
			relativeTime: {
				future: 'now',
				past: '%s',
				s: 'now',
				m: '1 m',
				mm: '%d m',
				h: '1 h',
				hh: '%d h',
				d: '1 d',
				dd: '%d d',
				M: '1 m',
				MM: '%d m',
				y: '1 y',
				yy: '%d y'
			}
		});

		platform.ready().then(() => {
			StatusBar.styleBlackTranslucent();
			Splashscreen.hide();

			if (platform.is('cordova') && cordova.plugins.iosrtc) {
				cordova.plugins.iosrtc.registerGlobals();
			}
		});

		events.subscribe('call.status.isincall', status => {
			console.debug('call status changed to ', status);
			this.isInCall = status;
		});
	}
}