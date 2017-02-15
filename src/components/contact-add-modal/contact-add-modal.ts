// add contact to a chat modeal

import { Component } from '@angular/core';
import { ModalController, ViewController } from 'ionic-angular';
import { ContactModal } from '../../components';
import { ContactService } from '../../services';

@Component({
	templateUrl: 'contact-add-modal.html',
	selector: 'modal-add-contact'
})
export class ContactAddModal {
	contacts = []

	constructor(private viewCtrl: ViewController, private modalCtrl: ModalController, private contactService: ContactService) {
		this.contacts = contactService.contacts;
	}

	close() {
		this.viewCtrl.dismiss();
	}

	// tap and hold contact card
	contactCard(contact) {
		let modal = this.modalCtrl.create(ContactModal, {contact: contact});
		modal.present();
	}

	add(contact) {
		this.viewCtrl.dismiss(contact);
	}
}