/**
 * The list view's paging.
 *
 * The page size is a setting so an operator can widen it for a tenant with a
 * big screen, and the theme is a setting because it is a preference rather than
 * a constant.
 */
export function paginate(items, { settings, page = 1 }) {
  const size = 50
  const start = (Math.max(1, page) - 1) * size
  return {
    items: items.slice(start, start + size),
    size,
    pages: Math.max(1, Math.ceil(items.length / size)),
  }
}

export function themeFor(settings) {
  return settings.get('ui.theme')
}
