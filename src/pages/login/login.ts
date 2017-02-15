// login and signup page

import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { LoginService } from '../../services';
import { ChatsPage } from '../';

declare var window:any;

@Component({
	selector: 'page-login',
	templateUrl: 'login.html'
})
export class LoginPage {
	focus = false
	input = false
	data = {
		username:null,
		password: null
	}

	constructor(private navCtrl: NavController, private loginService: LoginService) {
		// forward to chats if we are already logged in
		loginService.complete.then(user => {
			// we dont need to do this since its handled in the login function, but just in case you want to do it here
			//this.navCtrl.push(ChatsPage, {}, {animate: true, direction: 'forward'});
		});
	}

	// begin the login
	login() {
		this.loginService.login(this.data).then(() => {
			this.navCtrl.setRoot(ChatsPage, {}, {animate: true, direction: 'forward'});
		}, data => {
			console.log(data);
		});
	};

}