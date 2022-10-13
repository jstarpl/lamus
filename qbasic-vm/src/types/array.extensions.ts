import { IVisitor } from '../IVisitor'

declare global {
	interface Array<T> {
		accept(visitor: IVisitor): void
	}
}

Array.prototype.accept = function(visitor: IVisitor): void {
	for (let i = 0; i < this.length; i++) {
		if (!this[i]) {
			continue
		}
		this[i].accept(visitor)
	}
}
