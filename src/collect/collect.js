import { allocableMsTalent, createOutOfMsMessage } from "../allocableMsTalent/allocableMsTalent.js"
import { mixin } from "@dmail/mixin"
import { createAction } from "../action"
import { createIterator, compose } from "../compose/compose.js"

export const collectSequence = (iterable, { failureIsCritical = () => false } = {}) => {
	const results = []
	let someHasFailed = false

	return compose({
		iterator: createIterator(iterable),
		composer: ({ value, state, index, nextValue, done, fail, pass }) => {
			if (index > -1) {
				results.push({ state, result: value })
			}
			if (state === "failed") {
				if (failureIsCritical(value)) {
					return fail(value)
				}
				someHasFailed = true
			}
			if (done) {
				if (someHasFailed) {
					return fail(results)
				}
				return pass(results)
			}
			return nextValue
		},
	})
}

export const createActionWithAllocableMs = () => {
	return mixin(createAction(), allocableMsTalent)
}

export const collectSequenceWithAllocatedMs = (iterable, { allocatedMs = Infinity } = {}) => {
	const results = []
	let someHasFailed = false

	const from = createActionWithAllocableMs(allocatedMs)
	let currentExpirationToken = from.allocateMs(allocatedMs)
	from.pass()

	return compose({
		from,
		iterator: createIterator(iterable),
		composer: ({ action, value, state, index, nextValue, done, fail, pass }) => {
			if (index > -1) {
				// I should also measure duration before action pass/fail
				results.push({ state, result: value })
			}
			if (state === "failed") {
				if (value === currentExpirationToken) {
					// fail saying we are out of 10ms
					// even if the action may say it failed because it had only 8ms
					// because the composedAction has 10ms
					// even if its subaction may have less
					return fail(createOutOfMsMessage(allocatedMs))
				}
				someHasFailed = true
			}
			if (done) {
				if (someHasFailed) {
					return fail(results)
				}
				return pass(results)
			}

			const nextAction = createActionWithAllocableMs()
			currentExpirationToken = nextAction.allocateMs(action.getRemainingMs())
			nextAction.pass(nextValue)

			return nextAction
		},
	})
}

// export const collectConcurrent = (iterable, allocatedMs = Infinity)
// export const collectConcurrentWithAllocatedMs = (iterable, allocatedMs = Infinity)
