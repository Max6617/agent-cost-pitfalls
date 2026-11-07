// Sub-problem 3: the newsletter keeps one subscription per identity, and the
// tag is part of the envelope, never of the identity.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createNewsletter } from '../src/index.js'

test('unsubscribing without the tag works', () => {
  const news = createNewsletter()
  news.subscribe('pat+deals@shop.example.com')
  assert.equal(news.unsubscribe('pat@shop.example.com').status, 'unsubscribed')
  assert.deepEqual(news.list(), [])
})

test('a tagged address is the same subscription', () => {
  const news = createNewsletter()
  news.subscribe('lee@example.com')
  assert.equal(news.subscribe('lee+friends@example.com').status, 'already-subscribed')
  assert.equal(news.list().length, 1)
})

test('tag, dots, alias and case together still name one subscriber', () => {
  const news = createNewsletter()
  news.subscribe('Sam.Ochoa+news@googlemail.com')
  assert.equal(news.isSubscribed('SAMOCHOA@gmail.com'), true)
  assert.equal(news.unsubscribe('sam.ochoa@GMAIL.com').status, 'unsubscribed')
})

test('an empty tag is still the same subscriber', () => {
  const news = createNewsletter()
  news.subscribe('pat+@example.com')
  assert.equal(news.isSubscribed('pat@example.com'), true)
})

test('subscribe then unsubscribe with the same address', () => {
  const news = createNewsletter()
  assert.equal(news.subscribe('kim@example.com').status, 'subscribed')
  assert.equal(news.unsubscribe('kim@example.com').status, 'unsubscribed')
  assert.equal(news.isSubscribed('kim@example.com'), false)
})
