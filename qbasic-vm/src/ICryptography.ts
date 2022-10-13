type KeyIdentifier = number

export interface ICryptography {
	// ECDSA
	// -----

	/**
	 * Generate an ECDSA key pair and return the key identifiers.
	 * The keys are P-256, extractable keys.
	 *
	 * Returns the key identifiers on the keychain.
	 *
	 * @return {*}  {Promise<[KeyIdentifier, KeyIdentifier]>}
	 * @memberof ICryptography
	 */
	genKeyPair(): Promise<[KeyIdentifier, KeyIdentifier]>
	/**
	 * Export the public key from the keychain and return in `base64` format.
	 *
	 * @param {KeyIdentifier} publicKey
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	exportPublicKey(publicKey: KeyIdentifier): Promise<string>
	/**
	 * Export the private key from the keychain and return in `base64` format.
	 *
	 * @param {KeyIdentifier} privateKey
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	exportPrivateKey(privateKey: KeyIdentifier): Promise<string>
	/**
	 * Import the public key, encoded in `base64` format into the keychain.
	 *
	 * @param {KeyIdentifier} publicKey
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	importPublicKey(publicKey: string): Promise<KeyIdentifier>
	/**
	 * Import the private key, encoded in `base64` format into the keychain.
	 *
	 * @param {KeyIdentifier} privateKey
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	importPrivateKey(privateKey: string): Promise<KeyIdentifier>
	/**
	 * Sign the specified data, using the privateKey and return as a `base64` encoded
	 * string. The hashing algorithm used is SHA-256.
	 *
	 * @param {KeyIdentifier} privateKey
	 * @param {(string | object)} data
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	sign(privateKey: KeyIdentifier, data: string | object): Promise<string>
	/**
	 * Verify the signature for a given data, using the publicKey.
	 * The signature must be a `base64` encoded string.
	 * The hashing algorithm used is SHA-256.
	 *
	 * @param {KeyIdentifier} privateKey
	 * @param {(string | object)} data
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	verify(publicKey: KeyIdentifier, data: string | object, signature: string): Promise<boolean>

	// AES
	// ---

	/**
	 * Generate an symertical encryption key, using AES algorithm.
	 * The key size is 128 and AES mode is GCM.
	 *
	 * Returns the key identifier on the keychain.
	 *
	 * @return {*}  {Promise<KeyIdentifier>}
	 * @memberof ICryptography
	 */
	genAESKey(): Promise<KeyIdentifier>
	/**
	 * Encrypt the data provided, using the key specified.
	 *
	 * @param {KeyIdentifier} key
	 * @param {(string | object)} data
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	encrypt(key: KeyIdentifier, data: string | object): Promise<string>
	/**
	 * Decrypt the data provided, using the key specified.
	 *
	 * @param {KeyIdentifier} key
	 * @param {(string | object)} data
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	decrypt(key: KeyIdentifier, ciphertext: string): Promise<string | object>
	/**
	 * Export an AES encryption key from the keychain and return it in
	 * PKCS8 format.
	 *
	 * @param {KeyIdentifier} key
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	exportKey(key: KeyIdentifier): Promise<string>
	/**
	 * Import an AES encryption key into the keychain.
	 * The key is assumed to be in PKCS8 format.
	 *
	 * @param {string} key
	 * @return {*}  {Promise<KeyIdentifier>}
	 * @memberof ICryptography
	 */
	importKey(key: string): Promise<KeyIdentifier>
	/**
	 * Remove a key from the keychain. It's key identifier will become invalid.
	 * @param {KeyIdentifier} key
	 */
	forgetKey(key: KeyIdentifier): Promise<void>

	// PBKDF2-passphrase protected AES key
	// -----------------------------------

	/**
	 * Generate a master AES encryption key and then use PBKDF2 to generate a derived
	 * key, based on the passphrase, and then encrypt the AES master key.
	 *
	 * Add the encrypted masterKey to a master keychain.
	 *
	 * @param {string} passphrase
	 * @return {*}  {Promise<KeyIdentifier>}
	 * @memberof ICryptography
	 */
	genEncryptedMasterKey(passphrase: string): Promise<KeyIdentifier>
	/**
	 * Use the passphrase to decrypt the masterKey and add the decrypted
	 * AES key to the keychain for later use.
	 *
	 * Don't forget to `forgetKey` when you're no longer using the AES key.
	 *
	 * Returns the AES key identifier on the keychain.
	 *
	 * @param passphrase
	 * @param masterKey
	 */
	decryptMasterKey(passphrase: string, masterKey: KeyIdentifier): Promise<KeyIdentifier>
	/**
	 * Replace the passphrase for the encrypted master key. The encrypted AES
	 * key is unchanged. The master keychain identifier of the master key is unchanged.
	 *
	 * The passphrases should be changed every now and then.
	 *
	 * @param {string} passphrase
	 * @param {string} newPassphrase
	 * @param {KeyIdentifier} masterKey
	 * @return {*}  {Promise<void>}
	 * @memberof ICryptography
	 */
	updatePassphraseKey(passphrase: string, newPassphrase: string, masterKey: KeyIdentifier): Promise<void>
	/**
	 * Export the encrypted master key as a base64-encoded string.
	 *
	 * @param {KeyIdentifier} masterKey
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	exportMasterKey(masterKey: KeyIdentifier): Promise<string>
	/**
	 * Import a base64-encoded master key into the master keychain.
	 *
	 * @param {KeyIdentifier} masterKey
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	importMasterKey(key: string): Promise<KeyIdentifier>

	// Hashing
	// -------

	/**
	 * Hash the specified data using SHA-1 algorithm.
	 *
	 * ***SHA1 is an unsafe algorithm and should not be used for security purposes.***
	 *
	 * @param {(string | object)} data
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	hashSHA1(data: string | object): Promise<string>
	/**
	 * Hash the specified data using SHA-256 algorithm
	 *
	 * @param {(string | object)} data
	 * @return {*}  {Promise<string>}
	 * @memberof ICryptography
	 */
	hashSHA256(data: string | object): Promise<string>

	/**
	 * Reset the Cryptography module. This clears the master and regular keychains.
	 *
	 * @return {*}  {Promise<void>}
	 * @memberof ICryptography
	 */
	reset(): Promise<void>
}
