/**
	Copyright 2021 Jan Starzak

	This file is part of qbasic-vm

	qbasic-vm is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	qbasic-vm is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with qbasic-vm.  If not, see <http://www.gnu.org/licenses/>.
*/

export enum FileAccessMode {
	INPUT = 'I',
	OUTPUT = 'O',
	APPEND = 'A',
	RANDOM = 'R',
	BINARY = 'B'
}

export interface IFileSystem {
	/**
	 * Path separator string
	 *
	 * @type {string}
	 * @memberof IFileSystem
	 */
	readonly pathSeparator: string
	/**
	 * Get a number of a free file handle
	 *
	 * @return {*}  {number}
	 * @memberof IFileSystem
	 */
	getFreeFileHandle(): number
	/**
	 * Get an array of used file handles
	 *
	 * @return {*}  {number[]}
	 * @memberof IFileSystem
	 */
	getUsedFileHandles(): number[]
	/**
	 * Verify that access to a file with a given fileName is possible
	 *
	 * @param {string} fileName
	 * @return {*}  {Promise<boolean>}
	 * @memberof IFileSystem
	 */
	access(fileName: string): Promise<boolean>
	/**
	 * Open a file for access in the specified mode and return it's handle
	 *
	 * @param {number} handle
	 * @param {string} fileName
	 * @param {FileAccessMode} mode
	 * @return {*}  {Promise<void>}
	 * @memberof IFileSystem
	 */
	open(handle: number, fileName: string, mode: FileAccessMode): Promise<void>
	/**
	 * Close a file represented by handle.
	 *
	 * @param {number} handle
	 * @return {*}  {Promise<void>}
	 * @memberof IFileSystem
	 */
	close(handle: number): Promise<void>
	/**
	 * Write to the file. Data from the buffer must be flushed no later that
	 * at .close()
	 *
	 * @param {number} handle
	 * @param {(string | number | object)} buf
	 * @return {*}  {Promise<void>}
	 * @memberof IFileSystem
	 */
	write(handle: number, buf: string | number | object): Promise<void>
	/**
	 * Read from the file. If file was written to and not yet closed, the results
	 * will be implementation-specific.
	 *
	 * @param {number} handle
	 * @return {*}  {(Promise<string | number | object>)}
	 * @memberof IFileSystem
	 */
	read(handle: number): Promise<string | number | object>
	/**
	 * Get the entire contents of the file from handle, without modifying the
	 * current file access cursor.
	 *
	 * @param {number} handle
	 * @return {*}  {(Promise<Blob>)}
	 * @memberof IFileSystem
	 */
	getAllContentsBlob(handle: number): Promise<Blob>
	/**
	 * Seek to file position. If file is in INPUT, APPEND or BINARY mode, position
	 * is in octets since begging of file. If file is in RANDOM mode, position is
	 * in records since beggining of file. If file is in OUTPUT mode, this is a
	 * no-op.
	 *
	 * @param {number} handle
	 * @param {number} pos
	 * @return {*}  {Promise<void>}
	 * @memberof IFileSystem
	 */
	seek(handle: number, pos: number): Promise<void>
	eof(handle: number): Promise<boolean>
	directory(fileSpec: string): Promise<string[]>
	kill(fileSpec: string): Promise<void>[]
}
