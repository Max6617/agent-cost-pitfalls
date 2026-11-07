// Sub-problem 2: plural category selection per the docs table.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pluralCategory, createMessageService } from '../src/index.js'

const bundles = {
  en: {
    'cart.items': { one: '{n} item', other: '{n} items' },
    'inbox.unread': {
      zero: 'No unread messages',
      one: '{n} unread message',
      other: '{n} unread messages',
    },
  },
  fr: {
    'cart.items': { one: '{n} article', other: '{n} articles' },
    'stock.left': { one: '{n} en stock' },
  },
}

const strict = () => createMessageService({ bundles, mode: 'strict' })

test('an explicit zero form wins whenever n is zero', () => {
  assert.equal(strict().t('inbox.unread', { locale: 'en', n: 0 }), 'No unread messages')
})

test('french counts zero as singular', () => {
  assert.equal(strict().t('cart.items', { locale: 'fr', n: 0 }), '0 article')
})

test('the french category boundary includes zero', () => {
  assert.equal(pluralCategory('fr', 0), 'one')
})

test('a region never changes the plural rule of its language', () => {
  assert.equal(pluralCategory('fr-CA', 0), 'one')
})

test('a regional locale renders the parent language plural forms by its rule', () => {
  assert.equal(strict().t('cart.items', { locale: 'fr-CA', n: 0 }), '0 article')
})

test('a message without an other form renders when the selected category exists', () => {
  // 'stock.left' defines only one; french selects one at n = 0, so it renders
  assert.equal(strict().t('stock.left', { locale: 'fr', n: 0 }), '0 en stock')
})
