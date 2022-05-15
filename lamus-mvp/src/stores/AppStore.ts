import { makeAutoObservable } from "mobx"
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'deviceId'

class AppStoreClass {
	deviceId = ''

	constructor() {
		makeAutoObservable(this)
		this.deviceId = localStorage.getItem(DEVICE_ID_KEY) || uuidv4()
		localStorage.setItem(DEVICE_ID_KEY, this.deviceId)
	}
}

export const AppStore = new AppStoreClass()
