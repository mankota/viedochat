import { Component } from '@angular/core';
import { NavController, ModalController, NavParams} from 'ionic-angular';
import { ChatsPage } from '../../pages';
import { UserImage } from '../../components';
import { CallService, ContactService } from '../../services';

@Component({
	templateUrl: 'contact-modal.html'
})
export class ContactModal {
	contact = null
	constructor(params: NavParams, public navCtrl: NavController, public callService: CallService, contactService: ContactService) {
		this.contact = contactService.get(params.get('contact'));
	}

	chat() {
		this.navCtrl.push(ChatsPage, {contact: this.contact.id}, {animate: true, direction: 'forward'});
	}

	call() {
		this.callService.triggerCall(this.contact.id)
	}

	cancel() {

	}
}