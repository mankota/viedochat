// user account page

import { Component } from '@angular/core';
import { LoginService } from '../../services';

@Component({
	selector: 'page-account',
	templateUrl: 'account.html'
})
export class AccountPage {
	public user = null

	constructor(public loginService: LoginService) {
		this.user = this.loginService.user;
	}

	logout() {
		this.loginService.logout();
	}
}