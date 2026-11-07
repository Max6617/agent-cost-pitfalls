import test from 'node:test'
import assert from 'node:assert/strict'
import { createNewsletter } from '../src/index.js'

test('unsubscribing works without the tag', () => {
  const news = createNewsletter()
  news.subscribe('pat+deals@shop.example.com')
  assert.equal(news.unsubscribe('pat@shop.example.com').status, 'unsubscribed')
  assert.deepEqual(news.list(), [])
})

test('a tagged address is the same subscription', () => {
  const news = createNewsletter()
  news.subscribe('lee@example.com')
  assert.equal(news.subscribe('lee+friends@example.com').status, 'already-subscribed')
})
