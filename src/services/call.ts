// handles incoming and outgoing video calls

import { Injectable, ApplicationRef } from '@angular/core';
import { SocketService} from './socket';
import { AudioService} from './audio';
import { ContactService } from './contact';
import { VideoService } from './video';
import { Config } from '../app/config';
import { Platform } from 'ionic-angular';
import { Events, ModalController } from 'ionic-angular';
import { DomSanitizer } from '@angular/platform-browser';

declare var
	cordova:any,
	window:any,
	RTCSessionDescription:any,
	RTCPeerConnection:any,
	RTCIceCandidate:any;

@Injectable()
export class CallService {
	maxTimer = 200000
	facing = 'front'
	pickupTimeout = null
	contact = null
	isInCall = false
	isCalling = false
	isAnswering = false
	//duplicateMessages
	muted = false
	lastState = null
	localStream = null
	peerConnection = null
	remoteVideo = null
	localVideo = null
	peerConnectionConfig = null
	modalShowing = false
	modal = null


	constructor(private ref:ApplicationRef, private sanitizer:DomSanitizer, private events: Events, public modalCtrl: ModalController, public socket: SocketService, public platform: Platform, private audio: AudioService, public contactService: ContactService, public video: VideoService) {
		// browser compatability for web views

		window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
		window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
		window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

		// STUN/TURN ice servers for connection negotiation
		this.peerConnectionConfig = {
			'iceServers': Config.ice
		};

		this.socket.on('messageReceived', (name, message) => {

			console.debug('Message', message);

			switch (message.type) {
				case 'call':
					console.debug('incoming call...', message);

					if (this.isCalling) {
						// we are trying to call eachother. just answer it automaticly
						if (this.contact.id == name) {
							clearTimeout(this.pickupTimeout);
							this.pickupTimeout = null;
							this.isCalling = false;
							this.isAnswering = true;
							this.answer();
							return;
						}

						// ignore this incoming call if we are busy
						this.ignore(false, name);
						return;
					}

					this.audio.play('calling');

					this.pickupTimeout = setTimeout(() => {
						console.log('Call took too long to pick up. Ending.');
						this.end();
					}, this.maxTimer);

					// start a new call
					this.contact = this.contactService.get(name);
					this.isAnswering = true;
					this.showModal();
					this.preview();
					this.refreshVideos();
					break;

				case 'answer':
					clearTimeout(this.pickupTimeout);
					this.pickupTimeout = null;

					this.isInCall = true;
					this.isCalling = false;
					this.refreshVideos();

					this.call(true, this.contact.id);
					break;

				case 'ignore':
				case 'cancel':
					this.end();
					break;

				case 'end':
					if (this.isInCall || this.isCalling || this.isAnswering) {
						this.end();
					}
					break;
/*
				case 'phonertc_handshake':
					if (duplicateMessages.indexOf(message.data) === -1) {
						this.Contact[name].receiveMessage(JSON.parse(message.data));
						duplicateMessages.push(message.data);
					}
					break;
*/

			}




			if (message.sdp) {
				this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
					if (message.sdp.type == 'offer') {
						this.peerConnection.createAnswer(d => {
//							this.gotDescription.call(this, [d]);
							this.gotDescription(d);
						}, e => {
							console.log('error creating answer', e);
						});
					}
				});
			} else if (message.ice) {
				this.peerConnection.addIceCandidate(new RTCIceCandidate(message.ice));
			}
		});
	}

	// place a new call
	public triggerCall(contact) {
		this.audio.play('calling');
		this.showModal();
		if (this.isInCall) {
			return;
		}

		this.preview();

		this.pickupTimeout = setTimeout(() => {
			console.log('Call took too long to pick up. Ending.');
			this.end();
		}, this.maxTimer);

		console.debug('calling ', contact);
		this.contact = this.contactService.get(contact);
		this.isCalling = true;
		this.socket.emit('sendMessage', contact, {
			type: 'call'
		});
	}

	// open the call modal
	showModal() {
		this.events.publish('call.trigger.show', this.contact);
		this.modalShowing = true;
	};

	private gotDescription(description) {
		console.log('got description', description, this.contact);
		this.peerConnection.setLocalDescription(description, () => {
			this.socket.emit('sendMessage', this.contact.id, {
				'sdp': description
			});
		}, e => {
			console.log('set description error', e)
		});
	}

	private gotIceCandidate(event) {
		if (event.candidate != null) {
			this.socket.emit('sendMessage', this.contact.id, {
				'ice': event.candidate
			});
		}
	}

	private gotRemoteStream(event) {
		console.log('got remote stream');
		this.remoteVideo = this.sanitizer.bypassSecurityTrustUrl(window.URL.createObjectURL(event.stream));
		this.refreshVideos();
	}

	// a hacky way to make sure we get the latest video position reguardless of animations or transitions
	// another way might be to use iosrtc.observeVideo(video) or an $interval
	refreshVideos() {
		// tell the modal that we need to revresh the video
		this.ref.tick();

		if (!this.platform.is('cordova')) {
			return;
		}
		try {
			for (var x = 0; x <= 3000; x+=300) {
				console.log(x)
				setTimeout(cordova.plugins.iosrtc.refreshVideos,x);
			}
		} catch (e) {
			console.log(e);
		}
	};

	hideModal() {
		this.events.publish('call.trigger.hide', true);
	}

	// end the call in either direction
	end() {
		if (this.peerConnection) {
			this.peerConnection.close();
		}

		this.localVideo = null;
		this.remoteVideo = null;
		this.isAnswering = false;
		this.isCalling = false;
		this.isInCall = false;
		this.localStream = null;

		this.video.disconnect().then(() => {
			this.hideModal();
			this.refreshVideos();
		});

		if (!this.contact) {
			return;
		}

		this.socket.emit('sendMessage', this.contact.id, {
			type: 'end'
		});
		this.contact = null;
	}

	// add local stream
	addStream(stream, timeout) {
		this.localStream = stream;
		setTimeout(() => {
			this.localVideo = this.sanitizer.bypassSecurityTrustUrl(window.URL.createObjectURL(stream));
		}, timeout);
	}

	// preview local video as full screen
	preview() {
		this.video.connect(true, true, this.facing).then(stream => {
			this.addStream(stream, 10);
		});
	};

	// begin a call using webrtc
	call(isInitiator, contactId) {
		console.log('calling ' + contactId + ', isInitiator: ' + isInitiator);

		var connect = () => {
			this.peerConnection = new RTCPeerConnection(this.peerConnectionConfig);

			this.peerConnection.onicecandidate = this.gotIceCandidate.bind(this);
			this.peerConnection.onaddstream = this.gotRemoteStream.bind(this);
			this.peerConnection.oniceconnectionstatechange = event => {
				this.lastState = event.target.iceConnectionState;
				console.debug('ice state', this.lastState);
				if (this.lastState === 'failed' || this.lastState === 'disconnected' || this.lastState === 'closed') {
					this.peerConnection = null;
					this.end();
				}
			};
			this.peerConnection.addStream(this.localStream);

			if (isInitiator) {
				//this.isCalling = true;
				console.debug('creating offer');
				this.peerConnection.createOffer(d => {
					//this.gotDescription.call(this, [d]);
					this.gotDescription(d);
				}, e => {
					console.log('error creating offer', e)
				});
			} else {
				//this.isAnswering = true;
			}
		};

		if (!this.localStream) {
			this.video.connect(true, true, this.facing).then(stream => {
				this.addStream(stream, 1000);
				connect();
			});
		} else {
			connect();
		}
		// session.on('sendMessage', data => {
		// 	Socket.emit('sendMessage', contact.id, {
		// 		type: 'phonertc_handshake',
		// 		data: JSON.stringify(data)
		// 	});
		// });
		//
		// this.Contact[contact.id] = session;
		//
	}

	// cancel a call being placed
	cancel() {
		this.socket.emit('sendMessage', this.contact.id, {
			type: 'cancel'
		});
		this.end();
	};

	// ignore an incomming call
	ignore(end, name) {
		this.socket.emit('sendMessage', name || this.contact.id, {
			type: 'ignore'
		});
		if (!end) return;
		this.end();
	};

	// answer in incoming call
	answer() {
		if (this.isInCall) {
			return;
		}

		clearTimeout(this.pickupTimeout);
		this.pickupTimeout = null;

		this.isInCall = true;
		this.isAnswering = false;
		this.call(false, this.contact.id);

		setTimeout(() => {
			this.socket.emit('sendMessage', this.contact.id, {
				type: 'answer'
			});
		});
		this.refreshVideos();
	}

	// swap the camera facing. defaults to front facing to start
	flip() {
		this.facing = this.facing == 'front' ? 'back' : 'front';

		this.video.connect(!this.muted, true, this.facing).then(stream => {
			console.debug('using new facing stream', stream);
			this.addStream(stream, 0);
			this.peerConnection.addStream(this.localStream);
		});
	}

	// mute the microphone and attach a new stream to connection
	// note: doesnt seem to work quite right on all brwosers
	mute() {
		this.muted = !this.muted;
		console.debug((this.muted ? '' : 'un') + 'muting...');

		if (this.muted) {
			this.video.mute();
		} else {
			this.video.unmute().then(stream => {
				console.debug('using muted stream', stream);
				this.addStream(stream, 0);
				this.peerConnection.addStream(this.localStream);
			});
		}
	}
}