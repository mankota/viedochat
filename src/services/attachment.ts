// handle s3 uploads

import { Injectable } from '@angular/core';
import { Platform, Events } from 'ionic-angular';
import { Config } from '../app/config';
import { SocketService } from '../services';
import { Http, Response, Headers, RequestOptions } from '@angular/http';

@Injectable()
export class AttachmentService {
	constructor(public platform: Platform, private socket: SocketService, private http: Http, private events: Events) {

	}

	public upload(up) {


		//var fileReader = new FileReader();
		//fileReader.readAsDataURL(file);

		// if its a video, we need to make a thumbnail
		/*
		if (file.indexOf('video') > -1) {
			let fileReader = new FileReader();
			fileReader.onload = () => {
				let blob = new Blob([fileReader.result], {type: file.type});
				let url = URL.createObjectURL(blob);
				let video = document.createElement('video');
				let timeupdate = () => {
					if (snapImage()) {
						video.removeEventListener('timeupdate', timeupdate);
						video.pause();
					}
				};
				video.addEventListener('loadeddata', () => {
					if (snapImage()) {
						video.removeEventListener('timeupdate', timeupdate);
					}
				});
				let snapImage = () => {
					let canvas = document.createElement('canvas');
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
					let image = canvas.toDataURL();
					let success = image.length > 100000;
					if (success) {
						let img = document.createElement('img');
						img.src = image;
					}
					return success;
				};

				video.addEventListener('timeupdate', timeupdate);
				video.preload = 'metadata';
				video.src = url;
				video.muted = true;
				video.play();

				fileReader.readAsArrayBuffer(file);
			}

		}

		*/

		return new Promise((resolve, reject) => {
			let request = {
				name: up.file.name,
				type: up.file.type,
				chat: up.chat.id
			}

			let self = this;

			this.socket.promise('s3-sign', request).then((res: any) => {
				console.debug('got response: ', res)

				self.http.put(res.signed, up.file).subscribe(
					data => {
						resolve({
							url: res.url,
							type: up.file.type,
							name: up.file.name,
							id: res.id
						});
					},
					err => reject('Error uploading file: ' + err),
					() => console.log('Successfully uploaded file: ', res)
				);


				/* old way of doing things for reference

				const xhr = new XMLHttpRequest();
				xhr.open('PUT', res.signedRequest);
				xhr.onreadystatechange = () => {
					if (xhr.readyState === 4) {
						if (xhr.status === 200) {
							resolve(res.url);
						} else {
							reject('error uploading');
						}
					}
				};
				xhr.send(file);
				*/
			});
		});
	}

}