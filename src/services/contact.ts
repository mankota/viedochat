// manages contacts

import { Injectable, ApplicationRef } from '@angular/core';
import { SocketService } from './';
import { Events } from 'ionic-angular';

@Injectable()
export class ContactService {
	contacts = []
	public user = null

	// manages contacts online status
	constructor(private ref: ApplicationRef, public socket: SocketService, public events: Events) {
		// triggered when a contact comes online
		this.socket.on('online', contact => {
			contact.online = true;
			this.setOnlineUsers([contact]);
		});

		// triggered when a contact goes offline
		this.socket.on('offline', contact => {
			contact.online = false;
			this.setOnlineUsers([contact]);
		});

		// triggered when we request new contacts
		this.socket.on('contacts', contacts => {
			console.debug('Contacts: ', contacts)
			this.setOnlineUsers(contacts);
		});

		// triggered after a successfull login
		this.events.subscribe('user.login', data => {
			this.user = data.user;
		});

		// triggeres after a logout event
		// note: this does not break the socket connection
		this.events.subscribe('user.logout', () => {
			this.user = null;
		});
	}

	// set online users
	private setOnlineUsers(contacts) {
		console.log('SET ONLINE USERS', this, contacts, this.user);

		// i think this happens when user is notified that they are online and we havent recieved the login thing yet
		if (!this.user) {
			console.error('No user yet for contats');
			return;
		}

		for (var x in contacts) {
			if (contacts[x].id == this.user.id) {
				continue;
			}
			var add = true;
			for (var xx in this.contacts) {
				if (this.contacts[xx].id == contacts[x].id) {
					// dont overwirte fields with empty data
					for (var xxx in contacts[x]) {
						this.contacts[xx][xxx] = contacts[x][xxx];
					}
					add = false;
					break;
				}
			}
			if (add) {
				this.contacts.push(contacts[x]);
			}
		}
		this.contacts.sort(this.sortContacts);
		console.debug('Contacts: ', this.contacts)
		this.ref.tick();
	};

	// sort contacts by online and last message
	private sortContacts(a, b) {
		if (!a) {
			return -1;
		}
		if (!b) {
			return 1;
		}
		if (a.online > b.online) {
			return -1;
		}
		if (a.online < b.online) {
			return 1;
		}
		if (new Date(a.lastDate) > new Date(b.lastDate)) {
			return -1;
		}
		if (new Date(a.lastDate) < new Date(b.lastDate)) {
			return 1;
		}
		return 0;
	};

	// get a contact and its details
	public get(id) {
		console.debug('getting contact on logout', id, this.user.id)
		if (id == this.user.id) {
			return this.user;
		}
		for (let contact of this.contacts) {
			if (contact.id == id) {
				return contact;
			}
		}
		return {
			id: id
		};
	}
}