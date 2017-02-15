// handle socket io connections

import { Injectable } from '@angular/core';
import { Config } from '../app/config';
import * as io from 'socket.io-client';

@Injectable()
export class SocketService {
	socket = null;

	constructor() {
		// connect to our server
		// change this url here
		this.socket = io.connect(Config.server);
	}

	// generate a unique custom request id
	private makeId(len) {
		var text = '';
		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$';
		for (var i = 0; i < (len || 10); i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	// send an event and get a response back
	public promise(eventName, request) {
		return new Promise((resolve, reject) => {

			var success = response => {
				console.debug(eventName + '|' + request.responseName + ': complete!');
				this.socket.removeListener(request.responseName, success);
				resolve(response);
			};

			request.responseName = '$response$' + this.makeId(10) + '$';
			console.debug(eventName + '|' + request.responseName + ': Sending socket promise...');
			this.socket.on(request.responseName, success);
			this.socket.emit(eventName, request);
		});
	}

	public emit(...args: any[]) {
		this.socket.emit(...args)
		// @BUG
		//this.socket.emit(args[0], args[1]);
	}

	public on(name, data) {
		this.socket.on(name, data);
	}

	public removeListener(name, data) {
		this.socket.removeListener(name, data);
	}
}