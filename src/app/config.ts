// static config variables

import { Component } from '@angular/core';

@Component({})
export class Config {

	// url of the chat server
	// for local development it will be something like http://192.168.0.214:9000/
	public static server = 'https://ionic-video-chat-server.herokuapp.com/';
	//public static server = 'https://worlddove.herokuapp.com/';
	//public static server = 'http://192.168.0.214:5000/';

	// enables or disables chat sounds. usefull for development
	public static audio = true;

	// STUN/TURN ice servers for connection negotiation
	public static ice = [
		{
			urls: 'stun:stun.l.google.com:19302'
		}, {
			urls: 'stun:stun.services.mozilla.com'
		}, {
			urls: 'stun:numb.viagenie.ca',
			username: 'mankota@gmail.com',
			credential: 'sparrow_1'
		}, {
			urls: 'turn:numb.viagenie.ca',
			username: 'mankota@gmail.com',
			credential: 'sparrow_1'
		}
	];
	// if we allow attachments or not.
	// be sure to configure your AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and S3_BUCKET in the server config
	public static attachments = true;

	// whether or enable markdown parsing client side
	public static markdown = true;
}