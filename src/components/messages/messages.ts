import { Component, Input } from '@angular/core';
import { ContactService } from '../../services/contact';

@Component({
	template: '<img src="{{image}}">',
	selector: 'user-image'
})

export class UserImage {
	@Input() contact
	image = null

	constructor(private contactService: ContactService) {
	}

	ngOnInit() {
		if (!this.contact) {
			return;
		}


		if (typeof this.contact == 'object') {
			this.image = this.contact.image;
		}

		if (typeof this.contact == 'string') {
			let getContact = this.contactService.get(this.contact);
			if (!getContact) {
				return;
			}
			this.image = getContact.image;
		}

		if (this.image) {
			this.image = 'assets/img/avatar/' + this.image;
		}
	}
}