// handle login and authenticaion for users

import { Injectable, ViewChild } from '@angular/core';
import { Events, Nav, NavController, AlertController, App, Platform } from 'ionic-angular';
import { AudioService, SocketService, ContactService } from './';
import { NativeStorage } from 'ionic-native';
import { LoginPage } from '../pages';

declare var localStorage:any;

@Injectable()
export class LoginService {

	user = null
	storage = null
	playLoginSound = true
	complete = null

	private nav:NavController;

	constructor(private contactService: ContactService, public platform: Platform, app: App, public audio: AudioService, public socket: SocketService, public events: Events, public alertCtrl: AlertController) {
		// define nativestorage to be backwards compatable with localStorage
		if (this.platform.is('cordova')) {
			this.storage = NativeStorage;
		} else {
			this.storage = {
				getItem: key => {
					return new Promise((resolve, reject) => {
						let data = null;
						try {
							data = JSON.parse(localStorage.getItem(key));
						} catch (e) {
						}
						resolve(data);
					});
				},
				setItem: (key, value) => new Promise((resolve, reject) => resolve(localStorage.setItem(key, JSON.stringify(value)))),
				remove: key => new Promise((resolve, reject) => resolve(localStorage.removeItem(key)))
			};
		}

		this.complete = this.makeComplete();

		this.nav = app.getActiveNav();

		// authenticate using jwt once socket is connected
		this.socket.on('connect', socket => {
			this.auth(false);
		});

		// unused
		this.socket.on('disconnect', socket => {
		});

		// triggered when the user logs in
		this.events.subscribe('user.login', data => {
			this.user = data.user;
		});
	}

	// authenticate a user using jwt
	public auth(force) {
		let complete = token => {
			console.debug('REAL TOKEN', token);
			if (token) {
				token = token.token;
			}
			console.debug('token', token);

			if (!this.user) {
				if (!token) {
					this.events.publish('auth', false);
					return this.go();
				}
			}

			let done = () => {
				this.socket.removeListener('auth_error', error);
				this.socket.removeListener('login_successful', success);
			};

			let error = message => {
				done();
				this.storage.remove('token');
				this.go();
				console.log('error auth.');
			};

			let success = (user) => {
				console.debug('Auth: ', user);
				done();
				if (this.playLoginSound) {
					this.playLoginSound = false;
					this.audio.play('login');
				}
				this.events.publish('user.login', {
					user: user
				});
			};

			this.socket.emit('auth', token);
			this.socket.on('login_successful', success);
			this.socket.on('auth_error', error);
		};
		this.storage.getItem('token').then(complete).catch(complete);
	}

	// go to the login page with no transitions
	public go() {
		this.nav.setRoot(LoginPage, {}, {animate: false})
		//this.nav.push(LoginPage, {}, {animate: false, direction: 'forward'});
	}

	// perform a login from the log in page
	public login(user) {
		this.complete = this.makeComplete();
		return new Promise((resolve, reject) => {
			let done = () => {
				this.socket.removeListener('login_error', error);
				this.socket.removeListener('login_successful', success);
			};

			let error = (message) => {
				let alert = this.alertCtrl.create({
					title: 'Error',
					subTitle: message,
					buttons: ['OK']
				});
				alert.present();
				done();

				//reject('login fail');
			};

			let success = (user, token) => {
				console.debug('Login: ', user);
				if (token) {
					this.storage.setItem('token', {token: token});
				}
				done();
				this.events.publish('user.login', {
					user: user
				});
				if (this.playLoginSound) {
					this.playLoginSound = false;
					this.audio.play('login');
				}
				resolve();
			};

			this.socket.on('login_error', error);
			this.socket.on('login_successful', success);
			this.socket.emit('login', user);
		});
	}

	// log the user out
	public logout() {
		this.playLoginSound = true;
		this.storage.remove('token');
		this.user = null;
		//$rootScope.contacts.length = 0;
		this.contactService.contacts.length = 0;
		this.events.publish('user.logout');
		this.go();
		this.socket.emit('logout', null);
		this.complete = this.makeComplete();
	}

	// a promise that fires once we have logged in
	// used by controllers
	public makeComplete() {
		let self = this;
		return new Promise((resolve, reject) => {
			if (self.user) {
				resolve(self.user);
				return;
			}
			var cleanA = self.events.subscribe('user.login', data => {
				//cleanA(); cleanB();
				resolve(data.user);
			});
			var cleanB = self.events.subscribe('auth', () => {
				//cleanA(); cleanB();
				//reject('auth fail');
			});
		});
	};
}