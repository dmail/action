// more or less equivalent to
// http://folktale.origamitower.com/api/v2.0.0/en/folktale.result.html
// http://folktale.origamitower.com/api/v2.0.0/en/folktale.validation.html

export const isAction = value => value && typeof value.then === "function"

export const createAction = () => {
	let state = "unknown"
	let result
	let willShortCircuit = false
	let ignoreNext = false

	const action = {}
	const isPassing = () => state === "passing"
	const isFailing = () => state === "failing"
	const isPassed = () => state === "passed"
	const isFailed = () => state === "failed"
	const isRunning = () => state === "unknown" || isPassing() || isFailing()
	const isEnded = () => isPassed() || isFailed()
	const pendingActions = []

	const runPendingActions = () => {
		pendingActions.forEach(pendingAction => {
			pendingAction.fn(action, result)
		})
		pendingActions.length = 0
	}
	const handleResult = (value, passing) => {
		state = passing ? "passing" : "failing"

		if (isAction(value)) {
			if (value === action) {
				throw new Error("an action cannot pass/fail with itself")
			}
			value.then(value => handleResult(value, true), value => handleResult(value, false))
		} else {
			state = passing ? "passed" : "failed"
			result = value
			runPendingActions()
		}
	}
	const fail = value => {
		if (ignoreNext) {
			ignoreNext = false
			return
		}
		if (willShortCircuit) {
			ignoreNext = true
			willShortCircuit = false
		}
		if (isFailed() || isFailing()) {
			throw new Error(`fail must be called once, it was already called with ${result}`)
		}
		if (isPassed()) {
			throw new Error(`fail must not be called after pass was called`)
		}
		handleResult(value, false)
	}
	const pass = value => {
		if (ignoreNext) {
			ignoreNext = false
			return
		}
		if (willShortCircuit) {
			ignoreNext = true
			willShortCircuit = false
		}
		if (isPassing() || isPassed()) {
			throw new Error(`pass must be called once, it was already called with ${result}`)
		}
		if (isFailed()) {
			throw new Error(`pass must not be called after fail was called`)
		}
		handleResult(value, true)
	}
	const then = (onPassed, onFailed) => {
		const nextAction = createAction()
		const nextActionHandler = () => {
			let nextActionResult = result

			if (isFailed()) {
				if (onFailed) {
					nextActionResult = onFailed(result)
				}
				nextAction.fail(nextActionResult)
			} else {
				if (onPassed) {
					nextActionResult = onPassed(result)
				}
				nextAction.pass(nextActionResult)
			}
		}
		if (isRunning()) {
			pendingActions.push({
				fn: nextActionHandler
			})
		} else {
			nextActionHandler()
		}

		return nextAction
	}
	const getState = () => state
	const getResult = () => result
	const shortcircuit = (fn, value) => {
		willShortCircuit = true
		return fn(value)
	}
	const mixin = (...args) => {
		// maybe allow only function, add use defineProperty to make them non enumerable ?
		args.forEach(arg => {
			let properties = typeof arg === "function" ? arg(action) : arg
			if (properties && typeof properties === "object") {
				Object.keys(properties).forEach(property => {
					if (action.hasOwnProperty(property)) {
						throw new Error(`action mixin error: ${property} property exists`)
					}
					action[property] = properties[property]
				})
			}
		})
		return action
	}

	return mixin(action, {
		mixin,
		getState,
		getResult,
		isPassing,
		isFailing,
		isPassed,
		isFailed,
		isRunning,
		isEnded,
		pass,
		fail,
		shortcircuit,
		then
	})
}

// passed("foo").then(console.log)

// const fs = require("fs")
// const path = require("path")

// const readFile = path =>
// 	createAction(({ pass }) =>
// 		fs.readFile(path, (error, buffer) => {
// 			if (error) {
// 				throw error
// 			}
// 			pass(buffer)
// 		})
// 	)
// const readFileAsString = path => readFile(path).chain(String)
// readFileAsString(path.resolve(__dirname, "./test.js")).then(console.log)
