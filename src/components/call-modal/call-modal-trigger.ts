// created to prevent circular dependencies on CallService and CallModal

import { Injectable } from '@angular/core';
import { ModalController, Events, ViewController} from 'ionic-angular';
import { CallModal } from '../../components';

@Injectable()
export class CallModalTrigger {
	modal = null

	constructor(private events: Events, private modalCtrl: ModalController) {
		let self = this;
		this.events.subscribe('call.trigger.show', data => {
			console.debug('SHOWING CALL FROM EVENT')
			self.call();
		});
	}

	public call() {
		this.modal = this.modalCtrl.create(CallModal);
		this.modal.present();
	}
}