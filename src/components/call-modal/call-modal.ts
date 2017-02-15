// call modal display

import { Component, Input } from '@angular/core';
import { ModalController, NavParams, Events, ViewController} from 'ionic-angular';
import { CallService } from '../../services/call';

@Component({
	templateUrl: 'call-modal.html',
	selector: 'modal-call'
})
export class CallModal {
	constructor(params: NavParams, private events: Events, private viewCtrl: ViewController, public callService: CallService) {
		this.events.subscribe('call.trigger.hide', data => {
			this.hide();
		});
	}

	hide() {
		this.events.publish('call.status.isincall', false);
		this.callService.refreshVideos();
		this.viewCtrl.dismiss();
	}

	ngOnInit() {
		this.events.publish('call.status.isincall', true);
	}
}