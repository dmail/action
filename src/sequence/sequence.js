import { isAction } from "../action.js"
import { fromFunction } from "../fromFunction/fromFunction.js"
import { passed } from "../passed/passed.js"

// ptet supprimer fn, maintenant qu'on a mapIterable non?
// surtout qu'on utilisera surement composeSequence et pas sequence directement du coup
export const sequence = (iterable, fn = v => v) =>
	fromFunction(({ pass, fail }) => {
		const iterator = iterable[Symbol.iterator]()
		const results = []

		const iterate = () => {
			const { done, value } = iterator.next()
			if (done) {
				return pass(results)
			}
			const valueModified = fn(value)
			if (isAction(valueModified)) {
				valueModified.then(
					result => {
						results.push(result)
						iterate()
					},
					result => {
						fail(result)
					}
				)
			} else {
				results.push(valueModified)
				iterate()
			}
		}
		iterate()
	})

export const chainFunctions = (firstFunction = () => {}, ...remainingFunctions) =>
	remainingFunctions.reduce((accumulator, fn) => accumulator.then(fn), passed(firstFunction()))
