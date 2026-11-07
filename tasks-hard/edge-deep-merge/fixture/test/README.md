# test/

The reproductions for the config bugs reported so far. Each file is the smallest
case that showed the symptom; they are not the acceptance criteria for the
toolkit, and passing all of them does not mean the merge rules in
`docs/merge-rules.md` hold.

```
node --test
node --test test/merge.test.js
```
