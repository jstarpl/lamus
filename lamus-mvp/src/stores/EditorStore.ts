import { makeAutoObservable } from "mobx"

const ACTIVE_DOCUMENT_KEY = 'activeDocument'

class EditorStoreClass {
	document: object = {}

	constructor() {
		makeAutoObservable(this)
		this.document = JSON.parse(localStorage.getItem(ACTIVE_DOCUMENT_KEY) || JSON.stringify([]))
	}

	setDocument(newDocument: object) {
		this.document = newDocument
		localStorage.setItem(ACTIVE_DOCUMENT_KEY, JSON.stringify(newDocument))
	}
}

export const EditorStore = new EditorStoreClass()
