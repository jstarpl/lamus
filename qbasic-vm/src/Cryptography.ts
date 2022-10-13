import {
	genKeyPair,
	exportPublicKey,
	exportPrivateKey,
	importPublicKey,
	importPrivateKey,
	sign,
	verify,
	genAESKey,
	encrypt,
	decrypt,
	exportKey,
	importKey,
	genEncryptedMasterKey,
	decryptMasterKey,
	updatePassphraseKey,
	hash,
	ProtectedMasterKey,
} from 'easy-web-crypto'
import { ICryptography } from './ICryptography'

export class Cryptography implements ICryptography {
	keyChain: (CryptoKey | undefined)[] = []
	masterKeyChain: ProtectedMasterKey[] = []

	constructor() {
		this.reset()
	}
	async genKeyPair(): Promise<[number, number]> {
		const { publicKey, privateKey } = await genKeyPair(true)
		return [this.keyChain.push(publicKey) - 1, this.keyChain.push(privateKey) - 1]
	}
	async exportPublicKey(publicKey: number): Promise<string> {
		const key = this.keyChain[publicKey]
		if (!key) throw new Error('Invalid key handle.')
		return await exportPublicKey(key, 'base64')
	}
	async exportPrivateKey(privateKey: number): Promise<string> {
		const key = this.keyChain[privateKey]
		if (!key) throw new Error('Invalid key handle.')
		return await exportPrivateKey(key, 'base64')
	}
	async importPublicKey(publicKey: string): Promise<number> {
		const key = await importPublicKey(publicKey)
		return this.keyChain.push(key) - 1
	}
	async importPrivateKey(privateKey: string): Promise<number> {
		const key = await importPrivateKey(privateKey)
		return this.keyChain.push(key) - 1
	}
	async sign(privateKey: number, data: string | object): Promise<string> {
		const key = this.keyChain[privateKey]
		if (!key) throw new Error('Invalid key handle.')
		return (await sign(key, data, 'base64', 'sha-256')).toString()
	}
	async verify(publicKey: number, data: string | object, signature: string): Promise<boolean> {
		const key = this.keyChain[publicKey]
		if (!key) throw new Error('Invalid key handle.')
		return await verify(key, data, signature, 'base64')
	}
	async genAESKey(): Promise<number> {
		const aesKey = await genAESKey(true, 'AES-GCM', 128)
		return this.keyChain.push(aesKey) - 1
	}
	async encrypt(keyId: number, data: string | object): Promise<string> {
		const key = this.keyChain[keyId]
		if (!key) throw new Error('Invalid key handle.')
		const cipherData = await encrypt(key, data)
		return [cipherData.iv, cipherData.ciphertext].join('.')
	}
	async decrypt(keyId: number, encryptedMessage: string): Promise<string | object> {
		const key = this.keyChain[keyId]
		if (!key) throw new Error('Invalid key handle.')
		const [iv, ciphertext] = encryptedMessage.split('.')
		return await decrypt(key, { ciphertext, iv })
	}
	async exportKey(keyId: number): Promise<string> {
		const key = this.keyChain[keyId]
		if (!key) throw new Error('Invalid key handle.')
		return (await exportKey(key, 'pkcs8')).toString()
	}
	async importKey(data: string): Promise<number> {
		const key = await importKey(data as any, 'pkcs8', 'AES-GCM')
		return this.keyChain.push(key) - 1
	}
	async forgetKey(key: number): Promise<void> {
		this.keyChain[key] = undefined
	}
	async genEncryptedMasterKey(passphrase: string): Promise<number> {
		const masterKey = await genEncryptedMasterKey(passphrase)
		return this.masterKeyChain.push(masterKey) - 1
	}
	async decryptMasterKey(passphrase: string, masterKey: number): Promise<number> {
		const master = this.masterKeyChain[masterKey]
		if (!master) throw new Error('Invalid key handle.')
		const key = await decryptMasterKey(passphrase, master)
		return this.keyChain.push(key) - 1
	}
	async updatePassphraseKey(passphrase: string, newPassphrase: string, masterKey: number): Promise<void> {
		const master = this.masterKeyChain[masterKey]
		if (!master) throw new Error('Invalid key handle.')
		const newMaster = await updatePassphraseKey(passphrase, newPassphrase, master)
		this.masterKeyChain[masterKey] = newMaster
	}
	async exportMasterKey(masterKey: number): Promise<string> {
		const master = this.masterKeyChain[masterKey]
		if (!master) throw new Error('Invalid key handle.')
		return btoa(JSON.stringify(master))
	}
	async importMasterKey(masterKey: string): Promise<number> {
		const data = JSON.parse(atob(masterKey))
		if (typeof data !== 'object' || !data['derivationParams'] || !data['encryptedMasterKey'])
			throw new Error('Invalid master key.')
		return this.masterKeyChain.push(data) - 1
	}
	async hash(data: string | object, name?: 'SHA-1' | 'SHA-256') {
		return hash(typeof data === 'string' ? data : JSON.stringify(data), 'base64', name)
	}
	async hashSHA1(data: string | object): Promise<string> {
		return this.hash(data, 'SHA-1')
	}
	async hashSHA256(data: string | object): Promise<string> {
		return this.hash(data, 'SHA-256')
	}
	async reset(): Promise<void> {
		this.keyChain.length = 0
		this.masterKeyChain.length = 0
	}
}
