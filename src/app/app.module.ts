import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { ChatsPage, ChatPage, LoginPage, AccountPage, ContactsPage } from '../pages';
import { CallModal, ContactModal, UserImage, CallModalTrigger, ContactAddModal, KeyboardAttach } from '../components';
import { AttachmentService, AudioService, CallService, ChatService, ContactService, LoginService, SocketService, VideoService} from '../services';
import { MomentModule } from 'angular2-moment';

@NgModule({
	declarations: [
		MyApp,
		ChatsPage,
		ChatPage,
		LoginPage,
		AccountPage,
		CallModal,
		ContactModal,
		UserImage,
		ContactsPage,
		ContactAddModal,
		KeyboardAttach
	],
	imports: [
		IonicModule.forRoot(MyApp),
		MomentModule
	],
	bootstrap: [IonicApp],
	entryComponents: [
		MyApp,
		ChatsPage,
		ChatPage,
		LoginPage,
		AccountPage,
		CallModal,
		ContactModal,
		UserImage,
		ContactsPage,
		ContactAddModal
	],
	providers: [AttachmentService, CallModalTrigger, LoginService, AudioService, SocketService, CallService, ContactService, VideoService, ChatService, {
		provide: ErrorHandler,
		useClass: IonicErrorHandler
	}]
})
export class AppModule { }