import { test } from "@dmail/test-cheap"
import { passed } from "../passed/passed.js"
import { failed } from "./failed.js"
import { assert, assertFailed, assertResult } from "../assertions.js"

test("failed.js", ({ ensure }) => {
	ensure("failed return an action failed with the value", () => {
		const value = 1
		const action = failed(value)
		assertFailed(action)
		assertResult(action, value)
	})

	ensure("failed with failed action", () => {
		const failedAction = failed()
		const action = failed(failedAction)
		assert.equal(action, failedAction)
	})

	ensure("failed with passed action", () => {
		const passedAction = passed()
		const action = failed(passedAction)
		assert.equal(action, passedAction)
	})
})
