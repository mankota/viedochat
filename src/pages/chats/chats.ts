import { Component, NgZone } from '@angular/core';
import { NavController, Events } from 'ionic-angular';
import { ChatPage, AccountPage, ContactsPage } from '../';
import { ContactModal } from '../../components';
import { LoginService, ChatService } from '../../services';

@Component({
	selector: 'page-chats',
	templateUrl: 'chats.html'
})
export class ChatsPage {
	constructor(private zone: NgZone, private events:Events, public chatService: ChatService, private navCtrl: NavController, private loginService: LoginService) {
		// contacts / chats list state
		loginService.complete.then(user => {
			console.debug('login complete');
			if (!user.id) {
				loginService.go();
			}
		}, () => {
			console.debug('login fail');
			loginService.go();
		});
	}

	// go to accounts
	account() {
		this.navCtrl.push(AccountPage, {}, {animate: true, direction: 'forward'});
	}

	// go to a chat
	chat(id) {
		this.navCtrl.push(ChatPage, {chatId: id}, {animate: true, direction: 'forward'});
	}

	goContacts() {
		this.navCtrl.setRoot(ContactsPage, {}, {animate: true, direction: 'back'});
	}
}