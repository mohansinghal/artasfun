import fs from 'node:fs'

const sourcePath = 'F:/MohanSinghal-Work/Python/WebSiteBuilder/ArtWithFun/ArtWithFunSiteStructure.json'
const configPath = 'src/site-config.json'
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

const cleanText = (value) => typeof value === 'string'
  ? value.replace(/<br\s*\/?>/gi, '\n\n').replace(/<[^>]*>/g, '').trim()
  : ''

const normalizeImage = (value) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const path = value.trim().replaceAll('\\', '/')
  return /^(https?:|data:)/i.test(path) || path.startsWith('/') ? path : `/${path}`
}

const sourcePages = new Map()
for (const page of source.pages ?? []) {
  if (!page.id) continue
  const previous = sourcePages.get(page.id)
  sourcePages.set(page.id, previous
    ? {
        ...previous,
        ...page,
        pageDescription: previous.pageDescription || page.pageDescription,
        featuredImage: previous.featuredImage || page.featuredImage,
      }
    : page)
}

const galleries = new Map((config.imageGalleries ?? []).map((gallery) => [
  gallery.id,
  { ...gallery, items: [...(gallery.items ?? [])] },
]))

const mergeGallery = (incoming) => {
  const current = galleries.get(incoming.id)
  if (!current) {
    galleries.set(incoming.id, incoming)
    return
  }

  const items = new Map()
  for (const item of [...(current.items ?? []), ...(incoming.items ?? [])]) {
    if (item.imageSource && !items.has(item.imageSource)) items.set(item.imageSource, item)
  }
  current.items = [...items.values()]
  current.title ||= incoming.title
  current.description ||= incoming.description
  current.itemsPerRow ||= incoming.itemsPerRow
}

for (const gallery of source.imagesGallery ?? []) {
  const title = gallery.galleryName || gallery.id
  const items = (gallery.items ?? [])
    .filter((item) => item.imagepath)
    .map((item, index) => ({
      title: item.heading || item.alttext || `${title} ${index + 1}`,
      imageSource: normalizeImage(item.imagepath),
      altText: item.alttext || item.heading || title,
    }))
  mergeGallery({
    id: gallery.id,
    title,
    description: cleanText(gallery.description2 || gallery.description1 || ''),
    itemsPerRow: Math.max(1, Number(gallery.itemperrow) || 1),
    items,
  })
}

for (const gallery of source.postsGalleries ?? []) {
  const title = gallery.galleryName || gallery.id
  const items = [...sourcePages.values()]
    .filter((page) => page.featuredImage && (page.internalTags ?? []).includes(gallery.internalTag))
    .map((page) => ({
      title: page.pageTitle || page.remarks || page.id,
      imageSource: normalizeImage(page.featuredImage),
      altText: page.pageTitle || page.remarks || page.id,
    }))
  mergeGallery({
    id: gallery.id,
    title,
    description: gallery.internalTag ? `Artwork tagged ${gallery.internalTag}.` : '',
    itemsPerRow: Math.max(1, Number(gallery.itemperrow) || 3),
    items,
  })
}

const existingPagesByHref = new Map((config.pages ?? []).map((page) => [page.href, page]))
const pagesByHref = new Map()
for (const page of sourcePages.values()) {
  const slug = String(page.destUrl || page.id).replaceAll('\\', '/').replace(/^\/+/, '')
  const href = page.homePage === 'Y' ? '/' : `/${slug}`
  const existing = existingPagesByHref.get(href)
  const imageGalleryId = page.imageGalleryID || page.postGalleryID || existing?.imageGalleryId || ''
  const gallery = galleries.get(imageGalleryId)
  const title = page.pageTitle || page.remarks || page.id
  const featuredImage = normalizeImage(page.featuredImage)
    || normalizeImage(existing?.featuredImage?.imageSource)
    || gallery?.items?.[0]?.imageSource
    || ''

  pagesByHref.set(href, {
    id: page.id,
    href,
    title,
    pageDescription: cleanText(page.pageDescription)
      || cleanText(page.remarks)
      || existing?.pageDescription
      || title,
    featuredImage: {
      imageSource: featuredImage,
      altText: title,
      position: existing?.featuredImage?.position || 'right',
    },
    imageGalleryId,
    ...(page.head1 ? { subtitle: cleanText(page.head1) } : {}),
    ...(page.internalTags ? { internalTags: page.internalTags } : {}),
    ...(page.externalTags ? { externalTags: page.externalTags } : {}),
  })
}

for (const page of config.pages ?? []) {
  if (page.href && !pagesByHref.has(page.href)) pagesByHref.set(page.href, page)
}

const seenIds = new Set()
config.pages = [...pagesByHref.values()].filter((page) => {
  if (seenIds.has(page.id)) return false
  seenIds.add(page.id)
  return true
})
config.imageGalleries = [...galleries.values()]

const flattenNavigation = (items = []) => items.flatMap((item) => [item, ...flattenNavigation(item.children ?? [])])
const pageHrefs = new Set(config.pages.map((page) => page.href))
const missingRoutes = [...new Set(flattenNavigation([
  ...(config.topNavigation ?? []),
  ...(config.leftNavigation ?? []),
]).map((item) => item.href))].filter((href) => !pageHrefs.has(href))
const invalidGalleryRefs = config.pages.filter((page) => page.imageGalleryId && !galleries.has(page.imageGalleryId))

if (missingRoutes.length || invalidGalleryRefs.length) {
  throw new Error(`Import validation failed: ${missingRoutes.length} missing routes, ${invalidGalleryRefs.length} invalid gallery references`)
}

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
console.log(JSON.stringify({
  importedUniquePageIds: sourcePages.size,
  finalPageCount: config.pages.length,
  finalGalleryCount: config.imageGalleries.length,
  navigationRoutes: pageHrefs.size,
  missingNavigationRoutes: missingRoutes.length,
  blankFeaturedImages: config.pages.filter((page) => !page.featuredImage.imageSource).length,
}, null, 2))
