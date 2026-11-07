# Validation conventions

Every record that enters the app — user, product, order, invoice, shipment,
settings — is checked by a validator before it is stored. This document is
the convention the team agreed before the modules were written; when a
module and this document disagree, the document is right and the module is
a bug.

## 1. The contract

- A validator is a pure function `validateX(input)` returning an **array of
  issue objects**. An empty array means the input is valid.
- A validator **never throws for an input error**. Bad input — wrong types,
  missing fields, malformed values, even an input that is not an object at
  all — comes back as issues. Throwing is reserved for programming errors,
  such as asking the registry to render a code that does not exist.
- Every issue has exactly three properties: `{ field, code, message }`.

## 2. field — dotted paths

`field` locates the offending value from the input root. Nested objects and
array indices are joined with dots: `address.zip`, `lines.0.qty`,
`lines.12.sku`. No brackets, no leading dot. An issue about the input as a
whole uses the empty string `''`.

## 3. code — the central registry

`code` is one of the keys of the registry (`src/registry.js`, re-exported
from `src/index.js` as `CODES`). Module-local codes are forbidden — the
frontend maps issues onto form fields by code, and an unregistered code
renders as a blank toast. The registry lists the codes in check order:

1. `required` — the field is missing. A field is missing when it is
   `undefined`, `null`, or the empty string `''`.
2. `type` — the value has the wrong type. `{type}` is one of `string`,
   `number`, `boolean`, `array`, `object`.
3. `integer` — a number that is not a whole number.
4. `min` / `max` — a number out of range, or an array with too few or too
   many entries.
5. `min-length` / `max-length` — a string too short or too long.
6. `format` — a string that does not match its documented shape; `{kind}`
   names the shape, using the labels from the tables below.
7. `enum` — a value outside the allowed list. `{values}` is the allowed
   values joined with `, `. Comparisons are case-sensitive.

## 4. message — rendered from the registry

`message` is the registry template for the code with its `{placeholders}`
filled in; `messageFor(code, params)` is the renderer. Modules never write
their own wording: two modules enforcing the same rule produce the same
string, and wording changes happen in one place.

## 5. How issues are reported

- **One issue per field**: the first failing check, in the registry's check
  order above. `name: ''` is `required`, not also `min-length`; `qty: 0.5`
  is `integer`, not also `min`.
- **Optional fields** that are missing produce no issue at all.
- Issues are listed in the order the fields are documented below, top to
  bottom; nested issues follow the parent field they belong to, and array
  elements are walked in index order.
- A nested object that is itself missing or of the wrong type is reported
  once, on the object (`address`), and its inner fields are not checked.
- An array element that is not an object is reported once, on the element
  itself (`lines.2`, code `type`, type `object`).
- An input that is not an object at all is a single issue: `field` `''`,
  code `type`, type `object`.

## 6. The fields

### user — `validateUser`

- `name` — required; string; min-length 2; max-length 60
- `email` — required; string; format `email address` (one `@`, non-empty
  local part, a dot in the domain, no spaces)
- `age` — optional; number; integer; min 18; max 130
- `address` — optional; object:
  - `city` — required; string
  - `zip` — required; string; format `zip code` (exactly five digits)

### product — `validateProduct`

- `sku` — required; string; format `SKU` (three capitals, a hyphen, four
  digits: `ABC-1234`)
- `title` — required; string; min-length 3; max-length 80
- `price` — required; number; min 0
- `stock` — optional; number; integer; min 0
- `tags` — optional; array; max 5 entries

### order — `validateOrder`

- `customerId` — required; string; format `customer id` (`cus-` followed by
  digits)
- `lines` — required; array; min 1 entry; each line:
  - `sku` — required; string; format `SKU`
  - `qty` — required; number; integer; min 1; max 99
- `coupon` — optional; string; format `coupon code` (exactly six upper-case
  letters or digits)

### invoice — `validateInvoice`

- `number` — required; string; format `invoice number` (`INV-`, four
  digits, a hyphen, three digits)
- `issued` — required; string; format `date (YYYY-MM-DD)`
- `due` — optional; string; format `date (YYYY-MM-DD)`
- `lines` — required; array; min 1 entry; each line:
  - `description` — required; string; min-length 3
  - `amount` — required; number; min 0

### shipment — `validateShipment`

- `carrier` — required; string; enum `ups`, `fedex`, `dhl`
- `tracking` — optional; string; min-length 8; max-length 24
- `weight` — required; number; min 0; max 70
- `address` — required; object:
  - `street` — required; string
  - `city` — required; string
  - `zip` — required; string; format `zip code`

### settings — `validateSettings`

- `theme` — optional; string; enum `light`, `dark`
- `pageSize` — optional; number; integer; min 5; max 100
- `notifications` — optional; object:
  - `email` — optional; boolean
  - `sms` — optional; boolean
