/**
 * Field limits. The API validates a request body against these, and the
 * importer validates a file against the same ones: a title that is too long for
 * the API is too long for the file, and finding that out at row 400 is worse
 * than finding it out at the door.
 */
export const MAX_ID = 64
export const MAX_TITLE = 120
export const MAX_TAGS = 8
export const MAX_KEY = 64
export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 1000
export const MAX_IMPORT_ROWS = 500

/** The header line the importer expects, and the field order it reads. */
export const CSV_HEADER = 'id,title,quantity,tags'
export const CSV_FIELDS = Object.freeze(['id', 'title', 'quantity', 'tags'])
