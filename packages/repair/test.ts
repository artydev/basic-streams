import {EventsList, emulate, t, v} from "../emulation"
import repair from "./index"

expect.addSnapshotSerializer(EventsList.jestSerializer)

function noop() {}

test("callback is called", () => {
  const result = emulate(create => {
    return repair(create(t(10), v(1), t(10), v(2)))
  })
  expect(result).toMatchSnapshot()
})

test("disposer is called", () => {
  const disposer = jest.fn()
  repair(() => disposer)(noop)()
  expect(disposer.mock.calls).toMatchSnapshot()
})

test("fixes stream #3: It must return unsubscribe function (aka `disposer`)", () => {
  expect(typeof repair(() => {})(noop)).toBe("function")
})

test("fixes stream #4: `cb` must be called with one argument", () => {
  const cb = jest.fn()
  repair(inCb => {
    inCb(1, 2)
  })(cb)
  expect(cb.mock.calls).toMatchSnapshot()
})

test("fixes stream #5: `disposer` must always return `undefined`", () => {
  expect(repair(() => () => 1)(noop)()).toBeUndefined()
})

test("fixes stream #6: After `disposer` was called, `cb` must not be called", () => {
  const cb = jest.fn()
  let inCb
  const unsub = repair(_inCb => {
    inCb = _inCb
  })(cb)
  unsub()
  inCb(1)
  expect(cb.mock.calls).toMatchSnapshot()
})
