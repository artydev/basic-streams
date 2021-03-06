import {EventsList, emulate, t, v, laterMock} from "../emulation"
import ofMany from "./index"
import take from "../take"

expect.addSnapshotSerializer(EventsList.jestSerializer)

test("works with array", () => {
  const cb = jest.fn()
  const array = [1, 2, 3]
  if (typeof Symbol === "function" && array[Symbol.iterator]) {
    array[Symbol.iterator] = undefined
  }
  ofMany(array)(cb)
  expect(cb.mock.calls).toMatchSnapshot()
})

test("works with generator", () => {
  const cb = jest.fn()
  ofMany(
    (function*() {
      yield 1
      yield 2
      yield 3
    })(),
  )(cb)
  expect(cb.mock.calls).toMatchSnapshot()
})

test("when interval provided spreads values in time", () => {
  const result = emulate(create => {
    return ofMany([1, 2, 3], 10, laterMock(create))
  })
  expect(result).toMatchSnapshot()
})

test("when interval provided disposer works", () => {
  function unsafeTakeOne(stream) {
    return cb => {
      let disposer = stream(x => {
        cb(x)
        disposer()
      })
      return disposer
    }
  }
  const result = emulate(create => {
    return unsafeTakeOne(ofMany([1, 2, 3], 10, laterMock(create)))
  })
  expect(result).toMatchSnapshot()
})

test("doesn't blow up call stack when scheduler is synchronous", () => {
  function scheduler(time) {
    return cb => {
      cb()
      return () => {}
    }
  }
  function* generator() {
    for (let i = 0; i <= 1000000; i++) {
      yield i
    }
  }
  const stream = ofMany(generator(), 10, scheduler)
  let count = 0
  let latestValue = null
  function cb(value) {
    count++
    latestValue = value
  }
  expect(() => stream(cb)).not.toThrow()
  expect({count, latestValue}).toMatchSnapshot()
})

test("correctly handles disposers when scheduler runs synchronously only first time", () => {
  const disposer = jest.fn()
  let runned = false
  function scheduler(time) {
    return cb => {
      if (!runned) {
        runned = true
        cb()
        return () => {}
      }
      return disposer
    }
  }
  ofMany([1, 2], 0, scheduler)(() => {})()
  expect(disposer.mock.calls).toMatchSnapshot()
})

test("doesn't drain iterable eagerly", () => {
  function* generator() {
    yield 1
    throw new Error("should not be reached")
  }
  expect(() =>
    emulate(create => {
      return take(1, ofMany(generator(), 10, laterMock(create)))
    }),
  ).not.toThrow()
})
