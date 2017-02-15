// long press for small contact modal

import { Component } from '@angular/core';
import { NavController, NavParams, ViewController } from 'ionic-angular';
import { ChatPage } from '../../pages';
import { CallService, ContactService } from '../../services';

@Component({
	templateUrl: 'contact-modal.html',
	selector: 'modal-contact'
})
export class ContactModal {
	contact = null
	constructor(private viewCtrl: ViewController, private params: NavParams, private navCtrl: NavController, private callService: CallService, private contactService: ContactService) {
	}

	chat() {
		this.navCtrl.push(ChatPage, {chatId: this.contact.id}, {animate: true, direction: 'forward'});
		this.cancel();
	}

	call() {
		this.callService.triggerCall(this.contact.id);
		this.cancel();
	}

	cancel() {
		this.viewCtrl.dismiss();
	}

	ngOnInit() {
		this.contact = this.contactService.get(this.params.get('contact').id);
	}
}