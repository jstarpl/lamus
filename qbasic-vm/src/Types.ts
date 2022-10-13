/**
    Copyright 2010 Steve Hanov
    Copyright 2019 Jan Starzak

    This file is part of qbasic-vm
	File originally sourced from qb.js, also licensed under GPL v3

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

export abstract class Type<T> {
	name: string

	public abstract createInstance(): T
	public abstract copy(value: T): T
}

export class NullType extends Type<null> {
	constructor() {
		super()

		// used to denote the absense of a parameter in system calls.
		this.name = ':NULL'
	}

	public createInstance() {
		return null
	}

	public copy(value: null) {
		return value
	}
}

export function DeriveTypeNameFromVariable(name: string): string | null {
	if (!name) return null
	switch (name[name.length - 1]) {
		case '$':
			return 'STRING'
		case '%':
			return 'INTEGER'
		case '&':
			return 'LONG'
		case '#':
			return 'DOUBLE'
		case '!':
			return 'SINGLE'
	}
	return null // Must use default type from DEFINT or single.
}

export class JSONType extends Type<object> {
	constructor() {
		super()

		this.name = 'JSON'
	}

	public createInstance() {
		return {}
	}

	public copy(value: object) {
		return JSON.parse(JSON.stringify(value))
	}
}

export class IntegerType extends Type<number> {
	constructor() {
		super()

		this.name = 'INTEGER'
	}

	public createInstance() {
		return 0
	}

	public copy(value: number) {
		return (Math.round(value + 32768) & 65535) - 32768
	}
}

export class SingleType extends Type<number> {
	constructor() {
		super()

		this.name = 'SINGLE'
	}

	public createInstance() {
		return 0.0
	}

	public copy(value: number) {
		return value
	}
}

export class DoubleType extends Type<number> {
	constructor() {
		super()

		this.name = 'DOUBLE'
	}

	public createInstance() {
		return 0.0
	}

	public copy(value: number) {
		return value
	}
}

export class StringType extends Type<string> {
	constructor() {
		super()

		this.name = 'STRING'
	}

	public createInstance() {
		return ''
	}

	public copy(value: string) {
		return value
	}
}

export class AnyType extends Type<any> {
	constructor() {
		super()

		this.name = 'ANY'
	}

	public createInstance() {
		throw new Error('Cannot create instance of AnyType.')
	}

	public copy() {
		throw new Error('Cannot copy an instance of AnyType.')
	}
}

export class ScalarVariable<T> {
	type: Type<T>
	value: any

	constructor(type: Type<T>, value: any) {
		this.type = type
		this.value = value
	}

	public copy() {
		return new ScalarVariable(this.type, this.type.copy(this.value))
	}
}

export class ArrayType<T> {
	elementType: Type<T>
	name: string

	constructor(elementType: Type<T>) {
		this.elementType = elementType
		this.name = 'ARRAY OF ' + elementType.name
	}
}

export type SomeArrayType =
	| ArrayType<NullType>
	| ArrayType<IntegerType>
	| ArrayType<SingleType>
	| ArrayType<DoubleType>
	| ArrayType<StringType>
	| ArrayType<JSONType>
	| ArrayType<AnyType>
	| ArrayType<UserType>
export type SomeScalarType =
	| NullType
	| IntegerType
	| SingleType
	| DoubleType
	| StringType
	| JSONType
	| AnyType
export type SomeType = SomeScalarType | SomeArrayType | UserType

export interface IUserTypeMembers {
	[key: string]: SomeScalarType
}

export class UserType extends Type<object> {
	members: IUserTypeMembers

	constructor(name: string, members: IUserTypeMembers) {
		super()

		this.name = name
		this.members = members
	}

	public createInstance() {
		let user = {}

		for (let name in this.members) {
			user[name] = new ScalarVariable<any>(
				this.members[name],
				this.members[name].createInstance()
			)
		}

		return user
	}

	public copy(value) {
		let newValue = {}
		for (let key in value) {
			newValue[key] = value[key].copy()
		}

		return newValue
	}
}

export class Dimension {
	lower: number
	upper: number

	constructor(lower: number, upper: number) {
		this.lower = lower
		this.upper = upper
	}
}

export class ArrayVariable<T extends SomeScalarType> {
	type: T
	dimensions: Dimension[]
	values: ScalarVariable<T>[]

	constructor(type: T, dimensions: Dimension[]) {
		this.type = type
		this.dimensions = dimensions
		this.values = []
		let totalSize = 1
		let i

		for (i = 0; i < this.dimensions.length; i++) {
			totalSize *= this.dimensions[i].upper - this.dimensions[i].lower + 1
		}

		for (i = 0; i < totalSize; i++) {
			this.values.push(
				new ScalarVariable<any>(this.type, this.type.createInstance())
			)
		}
	}

	public copy() {
		return this
	}

	private getIndex(indexes: number[]) {
		let mult = 1
		let index = 0

		// dbg.printf("Access array indexes: %s\n", indexes);
		for (let i = this.dimensions.length - 1; i >= 0; i--) {
			index += (indexes[i] - this.dimensions[i].lower) * mult
			mult *= this.dimensions[i].upper - this.dimensions[i].lower + 1
		}
		return index
	}

	public assign(indexes: number[], value: ScalarVariable<any>) {
		let index = this.getIndex(indexes)
		// dbg.printf("Assign %s to array index %d\n", value, index);
		this.values[index] = value
	}

	public access(indexes: number[]) {
		let index = this.getIndex(indexes)
		// dbg.printf("access array index %d\n", index);
		return this.values[index]
	}

	public resize(dimensions: Dimension[]) {
		this.dimensions = dimensions
		const oldValues = this.values
		this.values = []
		let totalSize = 1
		let i

		for (i = 0; i < this.dimensions.length; i++) {
			totalSize *= this.dimensions[i].upper - this.dimensions[i].lower + 1
		}

		for (i = 0; i < totalSize; i++) {
			this.values.push(
				oldValues[i] ||
					new ScalarVariable<any>(this.type, this.type.createInstance())
			)
		}
	}
}

export function IsNumericType(
	type: SomeType
): type is IntegerType | SingleType | DoubleType {
	return (
		type.name === 'INTEGER' || type.name === 'SINGLE' || type.name === 'DOUBLE'
	)
}

export function IsStringType(type: SomeType): type is StringType {
	return type.name === 'STRING'
}

export function IsArrayType(type: SomeType): type is SomeArrayType {
	return type instanceof ArrayType
}

export function IsUserType(type: SomeType): type is UserType {
	return type instanceof UserType
}

export function IsNullType(type: SomeType): type is NullType {
	return type instanceof NullType
}

export function AreTypesCompatible(type1: SomeType, type2: SomeType) {
	return (
		type1.name === type2.name ||
		(IsNumericType(type1) && IsNumericType(type2)) ||
		(IsArrayType(type1) &&
			IsArrayType(type2) &&
			(type1.elementType.name === 'ANY' || type2.elementType.name === 'ANY')) ||
		(!IsArrayType(type1) &&
			!IsArrayType(type2) &&
			(type1.name === 'ANY' || type2.name === 'ANY')) ||
		(IsArrayType(type1) && type2.name === 'ANY') // allow casting an array to ANY
	)
}
