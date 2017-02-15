'use strict';

// for our server we use both express and socket.io
// express is used for serving our static content
// socket.io is used for all messages, in and out






// config


// set this here or as an environment variable
var JWT_SECRET = process.env.JWT_SECRET || 'change-me-please!';

// this this to your s3 bucket name
var S3_BUCKET = process.env.S3_BUCKET || 'ionic-video-chat-v2-images';

// these are digested by aws and should be set in your environment vars, or here
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'your-key-here';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'your-access-key-here';




















// meat

const
	express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	mongo = require('mongodb').MongoClient,
	bcrypt = require('bcrypt'),
	jwt = require('jwt-simple'),
	helmet = require('helmet'),
	cors = require('cors'),
	ObjectId = require('mongodb').ObjectId,
	aws = require('aws-sdk');

var users = [];
var db = null;

// connect to the database
mongo.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ionic-video-chat', (err, d) => {
	if (err) {
		return console.log(err);
	}
	console.log('Connected to mongo');
	db = d;
});

// basic setup
app.use(helmet());
app.use(cors());
app.use(express.static('www'));

// home
app.get('/', (req, res) => {
	res.sendfile('index.html');
});


// generate random names. borrowed from Project Karma at http://karma.vg
var names = {
	first: ['chocolate', 'red', 'blue', 'pink', 'grey', 'purple', 'black', 'white', 'green', 'fast', 'slow', 'sleepy', 'naked', 'cooked', 'silly', 'yummy', 'running', 'flying', 'sitting', ],
	last: ['bunny', 'penguin', 'otter', 'wombat', 'sloth', 'koala', 'panther', 'shrimp', 'crab', 'tuna', 'salmon', 'cod', 'python', 'flamingo', 'moose', 'hawk', 'eagle', 'racoon', 'star', 'robin', 'lobster', 'monkey', 'octopus', 'owl', 'panda', 'pig', 'puppy', 'rabbit']
};

var Name = {
	random: () => {
		var first = names.first[Math.floor(Math.random() * names.first.length)];
		var last = names.last[Math.floor(Math.random() * names.last.length)];

		return first.charAt(0).toUpperCase() + first.slice(1) + ' ' + last.charAt(0).toUpperCase() + last.slice(1);
	}
}



// setup socket.io
io.on('connection', socket => {

	// pluck the current logged in user from the users array
	let checkUser = () => {
		for (let i in users) {
			if (socket.id == users[i].socket) {
				return users[i];
			}
		}
		return false;
	}

	// pluck the users connection by id
	let getSocket = user => {
		for (let i in users) {
			console.log('want id ', user)
			if (user == users[i].id) {
				return users[i];
			}
		}
		return false;
	}
	/*
		let exportUser = user => {
			let usr = {
				name: user.name,
				username: user.username,
				image: user.image,
				id: user.id || (user._id + '')
			};
		};
	*/
	// log a user in
	let logUserIn = user => {
		let usr = {
			name: user.name,
			username: user.username,
			image: user.image,
			id: user._id + '',
			online: true
		};
		users.push({
			id: usr.id,
			user: usr,
			socket: socket.id
		});

		// @todo: needs to work
		let us = users.map(u => {
			if (u.id != user.id) {
				return u.user;
			} else {
				return null;
			}
		});
		console.log(us);

		// create the jwt
		var token = jwt.encode(usr, JWT_SECRET, 'HS512');
		/*
		// im not sure if its more effecient to use promise.all or to emit them separatly. you decide
		Promise.all([getChats(user), getContacts(user)]).then(data => {
			socket.emit('login_successful', usr, chats, contacts, token);
		});
		*/

		socket.emit('login_successful', usr, token);

		getContacts(user).then(contacts => {
			socket.emit('contacts', contacts);

			getChats(usr.id).then(chats => {
				socket.emit('chats', chats);
			});

		});

		socket.broadcast.emit('online', usr);
		console.log(usr.username + ' logged in');
	};

	socket.on('chats', request => {
		let currentUser = checkUser();
		if (!currentUser) return;

		getChats(currentUser.id).then(chats => {
			socket.emit((request && request.responseName) || 'chats', chats);
		});
	});

	// recieve a jwt from the client and authenticate them
	socket.on('auth', token => {
		try {
			var decoded = jwt.decode(token, JWT_SECRET);
		} catch (e) {
			return socket.emit('auth_error');
		}

		if (!decoded || !decoded.id || decoded.id == 'undefined') {
			return socket.emit('auth_error');
		}

		// this is optional. you can typicaly assume the token is valid if you prefer and skip this additinal lookup
		db.collection('users').find({
			_id: ObjectId(decoded.id)
		}).toArray((err, data) => {
			if (err) {
				socket.emit('auth_error', 'Error');
				return console.log(err);
			}
			if (!data || !data[0] || !data[0]._id) {
				socket.emit('auth_error', 'Error');
				return console.log('data', data);
			}

			return logUserIn(data[0]);
		});
	});

	// log a client in by credentials
	socket.on('login', authUser => {
		if (!authUser) {
			return;
		}
		// if this socket is already connected,
		// send a failed login message
		let currentUser = checkUser();
		if (currentUser) {
			socket.emit('login_error', 'You are already connected.');
			return;
		}

		db.collection('users').find({
			username: authUser.username
		}).toArray((err, data) => {
			if (err) {
				socket.emit('login_error', 'Error');
				return console.log(err);
			}

			if (!data.length) {
				if (!authUser.username || !authUser.password) {
					return socket.emit('login_error', 'Username and Password required');
				}
				bcrypt.hash(authUser.password, 10, (err, hash) => {
					if (err) {
						socket.emit('login_error', 'Error');
						return console.log(err);
					}

					let avatar = (Math.floor(Math.random() * (17 - 1 + 1)) + 1) + '';
					avatar = '00'.substring(0, '00'.length - avatar.length) + avatar;
					db.collection('users').insert({
						name: Name.random(),
						username: authUser.username,
						password: hash,
						image: '1-81-' + avatar + '.svg'
					}, (err, data) => {
						if (err) {
							socket.emit('login_error', 'Error');
							return console.log(err);
						}
						console.log('adding user', data.ops[0]);
						logUserIn(data.ops[0]);
					});
				});
			} else {
				bcrypt.compare(authUser.password, data[0].password, (err, compare) => {
					if (err) {
						return socket.emit('login_error', 'Incorrect username or password');
					}
					logUserIn(data[0]);
				});
			}
		});
	});

	let getChat = userId => {
		return new Promise((resolve, reject) => {
			let currentUser = checkUser();

			db.collection('chats').find({
				$or: [{
						users: [ObjectId(currentUser.id), ObjectId(userId)]
					},
					{
						users: [ObjectId(userId), ObjectId(currentUser.id)]
					}
				]
			}).limit(1).next((err, data) => {
				if (data && data._id) {
					resolve(data);
					return;
				}

				db.collection('chats').insert({
					users: [ObjectId(currentUser.id), ObjectId(userId)],
					startDate: new Date,
					lastDate: new Date,
					lastMessage: null
				}, (err, data) => {
					if (err) return console.log(err);
					resolve(data.ops[0]);
				});
			});
		});
	}

	let formatChat = chat => {
		return {
			id: chat._id + '',
			lastDate: chat.lastDate,
			lastMessage: chat.lastMessage,
			startDate: chat.startDate,
			users: chat.users.map(user => {
				return user + ''
			})
		}
	}

	// recieve an event to send a message to another user
	socket.on('get-contact-chat', request => {
		let currentUser = checkUser();
		if (!currentUser) return;
		getChat(request.id).then(chat => {
			socket.emit(request.responseName || 'got-chat', formatChat(chat));
		});
	});

	// recieve an event to send a message to another user
	socket.on('message', (chatId, message, attachment) => {
		let currentUser = checkUser();
		if (!currentUser) return;

		// @todo: add rate limiting

		console.log('recieved message for ', chatId, message)

		db.collection('chats').find({
			_id: ObjectId(chatId)
		}).limit(1).next((err, chat) => {
			if (!chat || !chat._id) {
				console.log('Not a valid chat to send to', chatId);
				return;
			}
			updateChat(chat);
			addMessage(chat);
		});

		var updateChat = chat => {
			db.collection('chats').update({
					_id: chat._id
				}, {
					lastDate: new Date,
					lastMessage: message,
					users: chat.users,
					startDate: chat.startDate
				},
				(err, data) => {
					if (err) return console.log(err);
				});
		};

		var addMessage = (chat) => {
			db.collection('messages').insert({
				from: currentUser.id,
				date: new Date,
				message: message,
				attachment: attachment, // @todo: link instead of insert attachment
				chat: chat._id
			}, (err, data) => {
				if (err) {
					return console.log(err);
				}

				// tells us if it completed or not. not really needed.
				if (attachment) {
					db.collection('attachments').update({_id: ObjectId(attachment.id)}, {$set: {complete: true}});
				}

				data = data.ops[0];
				let send = {
					date: data.date,
					id: data._id + '',
					chat: data.chat + '',
					from: data.from,
					message: data.message
				};

				// send connection the notifications
				for (let contact of chat.users) {
					if (contact == currentUser.id) {
						continue;
					}
					let connection = getSocket(contact);
					console.log('message: from ' + currentUser.id + ' to ' + contact);
					io.to(connection.socket).emit('chat-message', currentUser.id, send);
				}
			});
		};
	});

	// add a user to the chat
	socket.on('add-to-chat', request => {
		let currentUser = checkUser();
		if (!currentUser) return;

		db.collection('chats').find({
			_id: ObjectId(request.chat)
		}).limit(1).next((err, chat) => {
			if (err || !chat) return;
			if (chat.users.indexOf(ObjectId(request.contact)) > -1) {
				return;
			}
			chat.users.push(ObjectId(request.contact));

			db.collection('chats').update({
					_id: chat._id
				}, {
					lastDate: chat.lastDate,
					lastMessage: chat.lastMessage,
					users: chat.users,
					startDate: chat.startDate
				},
				(err, data) => {
					if (err) return console.log(err);

					chatMessages(chat).then(messages => {
						for (let contact of chat.users) {
							let connection = getSocket(contact);
							console.log('adding user to chat ' + request.chat + ' / ' + request.contact);
							io.to(connection.socket).emit('chat', messages);
						}
					});
				});
		});
	});

	let chatMessages = chat => {
		return new Promise((resolve, reject) => {
			db.collection('messages').find({
				chat: chat._id
			}).toArray((err, messages) => {
				if (err) {
					return reject(err);
				}
				let c = formatChat(chat);
				c.messages = messages;
				resolve(c);
			});
		});
	}

	// get a list of messages for that chat
	socket.on('chat', request => {
		let currentUser = checkUser();
		if (!currentUser) return;

		db.collection('chats').find({
			_id: ObjectId(request.chat)
		}).limit(1).next((err, chat) => {
			if (err || !chat) return;

			chatMessages(chat).then(messages => {
				socket.emit(request.responseName || 'chat_messages', messages);
			});
		});
	});

	// get chats for current user
	let getChats = user => {
		return new Promise((resolve, reject) => {
			db.collection('chats').find({
				users: ObjectId(user)
			}).toArray((err, data) => {
				if (err) {
					reject();
					return console.log(err);
				}
				if (!data || !data[0]) {
					resolve([]);
					return;
				}

				data = data.map(chat => {
					return formatChat(chat);
				});

				resolve(data);
			});
		});
	}

	// get a list of contacts for the current user
	let getContacts = currentUser => {
		return new Promise((resolve, reject) => {
			db.collection('users').find({

			}).toArray((err, data) => {
				if (err) {
					reject();
					return console.log(err);
				}
				if (!data || !data[0]) {
					resolve([]);
					return;
				}

				let contacts = data.map(contact => {
					let online = false;

					for (let x in users) {
						if (users[x].id == contact._id) {
							online = true;
							break;
						}
					}
					return {
						id: contact._id + '',
						name: contact.name,
						username: contact.username,
						image: contact.image,
						online: online
					};
				});
				resolve(contacts);

			});
		});
	};

	// for now, all users are your contacts
	socket.on('contacts', userId => {
		let currentUser = checkUser();
		if (!currentUser) return;

		getContacts(currentUser).then(contacts => {
			socket.emit('contacts', contacts);
		});
	});

	// recieve a message to send to another client
	socket.on('sendMessage', (userId, message) => {
		let currentUser = checkUser();
		if (!currentUser) return;

		var contact;
		users.forEach(usr => {
			if (usr.id == userId) {
				contact = usr;
			}
		});

		if (!contact) {
			return;
		}

		console.log('sendMessage: from ' + currentUser.id + ' to ' + contact.id);
		io.to(contact.socket).emit('messageReceived', currentUser.id, message);
	});

	// sign an upload request
	socket.on('s3-sign', (request) => {

		let currentUser = checkUser();
		if (!currentUser) return;

		if (!request.name || !request.type || !request.chat) {
			return console.log('Cant sign request: ', request);
		}

		console.log('Singing: ', request)

		const s3 = new aws.S3();
		let ext = (request.name.split('.').pop().toLowerCase()) || 'ext';
		if (ext == 'MOV' && request.type == 'video/quicktime') {
			ext = 'mp4';
			request.type = 'video/mp4';
		}

		// @todo: add chat id checking
		db.collection('attachments').insert({
			name: request.name,
			type: request.type,
			chat: ObjectId(request.chat),
			date: new Date,
			complete: false
		}, (err, data) => {
			if (err) {
				return console.log(err);
			}
			console.log('data', data);
			let file = data.ops[0];
			let key = file._id + '.' + ext;

			let params = {
				Bucket: S3_BUCKET,
				Key: key,
				Expires: 60,
				ContentType: file.type,
				ACL: 'public-read'
			};

			console.log('Preparing file: ', params);

			s3.getSignedUrl('putObject', params, (err, data) => {
				if (err) {
					console.log(err);
					return;
				}
				socket.emit(request.responseName || 'sign_s3', {
					signed: data,
					url: 'https://' + S3_BUCKET + '.s3.amazonaws.com/' + key,
					id: file._id + ''
				});
			});
		});


	});

	// remove a connected user from the list of online users
	var disconnect = () => {
		for (var x in users) {

			if (users[x].socket == socket.id) {
				if (!users[x]) {
					socket.broadcast.emit('offline', users[x].user);
					console.log(users[x].user.username, ' disconnected');
				}
				users.splice(x, 1);
				return;
			}
		}
		console.log(socket.id + ' could not fully disconnect.');
	};

	socket.on('logout', disconnect);
	socket.on('disconnect', disconnect);
});


const port = process.env.PORT || 5000;
http.listen(port, () => {
	console.log('listening on port', port);
});