// display a user image, or set of user images

import { Component, Input } from '@angular/core';
import { ContactService } from '../../services/contact';

@Component({
	template: '<div class="user-image-container user-img-{{single}} user-img-count{{contacts.length}}"><img src="{{c.imagePath}}" class="user-img-{{single}}" *ngFor="let c of contacts"></div>',
	selector: 'user-image'
})

export class UserImage {
	@Input() contact
	@Input() hideSelf = false
	single = null
	contacts = []

	constructor(private contactService: ContactService) {
	}

	ngOnInit() {
		if (!this.contact) {
			return;
		}

		if (!(this.contact instanceof Array)) {
			this.contact = [this.contact];
		}

		for (let contact of this.contact) {
			let getContact = null;
			if (typeof contact == 'string') {
				getContact = this.contactService.get(contact);
				if (!getContact) {
					continue;
				}
			} else {
				getContact = contact;
			}

			if (this.hideSelf && this.contactService.user.id == getContact.id) {
				continue;
			}

			if (getContact.image) {
				getContact.imagePath = 'assets/img/avatar/' + getContact.image;
			}

			this.contacts.push(getContact);
		}

		this.single = this.contacts.length > 1 ? 'multi' : 'single';
	}
}