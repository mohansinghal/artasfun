import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FacebookIcon from '@mui/icons-material/Facebook'
import InstagramIcon from '@mui/icons-material/Instagram'
import YouTubeIcon from '@mui/icons-material/YouTube'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import siteConfig from './site-config.json'
import { useEffect, useId, useRef, useState } from 'react'

type NavigationItem = {
  id: string
  title: string
  href: string
  children?: NavigationItem[]
}

function publicAssetSource(source: string) {
  return `${import.meta.env.BASE_URL}${source.replace(/^\/+/, '')}`
}

function smallImageSource(source: string) {
  return publicAssetSource(source.replace(/^\/images\//, '/images-small/'))
}

function NavigationTree({ items, variant }: {
  items: NavigationItem[]
  variant: 'top' | 'side'
}) {
  const [openPath, setOpenPath] = useState<string[]>([])
  const treeRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    setOpenPath([])
  }, [location.pathname])

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !treeRef.current?.contains(event.target)) {
        setOpenPath((currentPath) => currentPath.length > 0 ? [] : currentPath)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPath([])
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div ref={treeRef} className={`nav-tree-container ${variant}-nav-container`}>
      <NavigationList
        items={items}
        variant={variant}
        openPath={openPath}
        setOpenPath={setOpenPath}
        parentPath={[]}
      />
    </div>
  )
}

function NavigationList({
  items,
  variant,
  openPath,
  setOpenPath,
  parentPath,
  id,
  expanded,
}: {
  items: NavigationItem[]
  variant: 'top' | 'side'
  openPath: string[]
  setOpenPath: (path: string[]) => void
  parentPath: string[]
  id?: string
  expanded?: boolean
}) {
  const depth = parentPath.length

  return (
    <ul
      id={id}
      hidden={depth > 0 && !expanded}
      className={`nav-tree ${variant}-nav-tree ${depth === 0 ? 'nav-root' : `nav-subtree ${variant}-nav-subtree`}`}
    >
      {items.map((item) => (
        <NavigationNode
          key={item.id}
          item={item}
          variant={variant}
          openPath={openPath}
          setOpenPath={setOpenPath}
          parentPath={parentPath}
        />
      ))}
    </ul>
  )
}

function NavigationNode({ item, variant, openPath, setOpenPath, parentPath }: {
  item: NavigationItem
  variant: 'top' | 'side'
  openPath: string[]
  setOpenPath: (path: string[]) => void
  parentPath: string[]
}) {
  const submenuId = useId()
  const hasChildren = Boolean(item.children?.length)
  const path = [...parentPath, item.id]
  const expanded = path.every((id, index) => openPath[index] === id) && openPath.length >= path.length

  return (
    <li className={`nav-tree-item ${variant}-nav-item`}>
      <div className={`nav-tree-row ${variant}-nav-row`}>
        <NavLink to={item.href} end={item.href === '/'}>
          {item.title}
        </NavLink>
        {hasChildren && (
          <button
            type="button"
            className="nav-tree-toggle"
            aria-label={`Show ${item.title} pages`}
            aria-expanded={expanded}
            aria-controls={submenuId}
            onClick={() => setOpenPath(expanded ? parentPath : path)}
          >
            <ExpandMoreIcon aria-hidden="true" />
          </button>
        )}
      </div>
      {hasChildren && (
        <NavigationList
          items={item.children!}
          variant={variant}
          openPath={openPath}
          setOpenPath={setOpenPath}
          parentPath={path}
          id={submenuId}
          expanded={expanded}
        />
      )}
    </li>
  )
}

function ConfiguredPage({ page }: { page: typeof siteConfig.pages[number] }) {
  type EnlargedImage = {
    images: { source: string; alt: string }[]
    index: number
    isGalleryImage: boolean
  }

  const configuredGallery = siteConfig.imageGalleries.find((item) => item.id === page.imageGalleryId)
  const gallery = configuredGallery
  const postGallery = siteConfig.postsGalleries.find((item) => item.id === page.postGalleryID)
  const postGalleryPages = postGallery
    ? siteConfig.pages.filter((item) => item.internalTags?.includes(postGallery.internalTag))
    : []
  const pageDescription = configuredGallery?.description || page.pageDescription
  const [enlargedImage, setEnlargedImage] = useState<EnlargedImage | null>(null)
  const featuredImageSource = gallery ? undefined : page.featuredImage?.imageSource
  const displayedImage = enlargedImage?.images[enlargedImage.index]
  const navigateGallery = (direction: -1 | 1) => {
    setEnlargedImage((current) => {
      if (!current?.isGalleryImage) return current
      return {
        ...current,
        index: (current.index + direction + current.images.length) % current.images.length,
      }
    })
  }

  return (
    <article className="site-page">
      <header className={`site-page-header featured-${page.featuredImage.position}`}>
        <div className="site-page-copy">
          {/* <span className="eyebrow">{siteConfig.siteName}</span> */}
          <Typography component="h2" variant="h4">{page.title}</Typography>
          <Typography className={`site-page-description${configuredGallery?.description ? ' site-page-gallery-description' : ''}`}>
            {pageDescription}
          </Typography>
        </div>
        {featuredImageSource && (
          <figure className="site-page-featured-image">
            <button
              type="button"
              className="site-page-featured-image-button"
              aria-label={`Enlarge ${page.featuredImage.altText || page.title}`}
              onClick={() => setEnlargedImage({
                images: [{
                  source: featuredImageSource,
                  alt: page.featuredImage.altText || page.title,
                }],
                index: 0,
                isGalleryImage: false,
              })}
            >
              <img src={smallImageSource(featuredImageSource)} alt={page.featuredImage.altText || page.title} />
            </button>
          </figure>
        )}
      </header>
      {enlargedImage && (
        <Dialog
          open
          onClose={() => setEnlargedImage(null)}
          maxWidth="xl"
          fullWidth
          aria-label={`${page.title} enlarged image`}
          className={`site-image-dialog${enlargedImage.isGalleryImage ? ' site-image-dialog-gallery' : ''}`}
          onKeyDown={(event) => {
            if (!enlargedImage.isGalleryImage) return
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              navigateGallery(-1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              navigateGallery(1)
            }
          }}
        >
          <DialogContent className="site-image-dialog-content">
            {enlargedImage.isGalleryImage && (
              <>
                <IconButton
                  className="site-image-dialog-navigation site-image-dialog-previous"
                  aria-label="Previous image"
                  onClick={() => navigateGallery(-1)}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography className="site-image-dialog-counter" aria-live="polite">
                  {enlargedImage.index + 1} / {enlargedImage.images.length}
                </Typography>
                <IconButton
                  className="site-image-dialog-navigation site-image-dialog-next"
                  aria-label="Next image"
                  onClick={() => navigateGallery(1)}
                >
                  <ChevronRightIcon />
                </IconButton>
              </>
            )}
            <IconButton
              className="site-image-dialog-close"
              aria-label="Close enlarged image"
              onClick={() => setEnlargedImage(null)}
            >
              <CloseIcon />
            </IconButton>
            {displayedImage && <img src={publicAssetSource(displayedImage.source)} alt={displayedImage.alt} />}
          </DialogContent>
        </Dialog>
      )}
      {gallery && (
        <section className="site-page-gallery" aria-label={`${page.title} image gallery`}>
          <div
            className="site-page-gallery-grid"
            style={{ gridTemplateColumns: `repeat(${gallery.itemsPerRow}, minmax(0, 1fr))` }}
          >
            {gallery.items.map((item) => (
              <figure className="site-gallery-item" key={item.title}>
                <button
                  type="button"
                  className="site-gallery-image-button"
                  aria-label={`Enlarge ${item.altText || item.title}`}
                  onClick={() => setEnlargedImage({
                    images: gallery.items.map((galleryItem) => ({
                      source: galleryItem.imageSource,
                      alt: galleryItem.altText || galleryItem.title,
                    })),
                    index: gallery.items.findIndex((galleryItem) => galleryItem === item),
                    isGalleryImage: true,
                  })}
                >
                  <img src={smallImageSource(item.imageSource)} alt={item.altText} />
                </button>
                <figcaption>{item.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      {postGallery && (
        <section className="site-post-gallery" aria-labelledby={`${page.id}-post-gallery-title`}>
          <Typography id={`${page.id}-post-gallery-title`} component="h2" variant="h5">
            {postGallery.galleryName.replace(/[-_]/g, ' ')}
          </Typography>
          <div
            className="site-post-gallery-grid"
            style={{ gridTemplateColumns: `repeat(${postGallery.itemperrow}, minmax(0, 1fr))` }}
          >
            {postGalleryPages.map((item) => (
              <NavLink className="site-post-gallery-card" key={item.id} to={item.href}>
                {item.featuredImage?.imageSource && (
                  <img
                    src={smallImageSource(item.featuredImage.imageSource)}
                    alt={item.featuredImage.altText || item.title}
                  />
                )}
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

export default function App() {
  const [logoLoadFailed, setLogoLoadFailed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon && siteConfig.logoImageSource) {
      favicon.href = publicAssetSource(siteConfig.logoImageSource)
    }
  }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="app-container">
        <title>{siteConfig.siteName}</title>
        <meta name="description" content={siteConfig.siteDescription} />
        <header className="brand-bar">
          <NavLink to="/" className="brand-lockup" aria-label={`${siteConfig.siteName} home`}>
            <span className="brand-mark">
              {siteConfig.logoImageSource && !logoLoadFailed ? (
                <img
                  src={publicAssetSource(siteConfig.logoImageSource)}
                  alt=""
                  onError={() => {
                    setLogoLoadFailed(true)
                    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
                    if (favicon) favicon.href = publicAssetSource('/favicon.svg')
                  }}
                />
              ) : (
                <PaletteOutlinedIcon />
              )}
            </span>
            <div>
              <span className="brand-name">{siteConfig.siteName}</span>
              <span className="brand-tagline">{siteConfig.siteDescription}</span>
            </div>
          </NavLink>
          <span className="brand-edition">{siteConfig.brandEdition}</span>
        </header>
        <AppBar position="static" className="header">
          <Toolbar className="top-toolbar">
            <nav className="top-links" aria-label="Main navigation">
              <NavigationTree items={siteConfig.topNavigation} variant="top" />
            </nav>
            <IconButton
              className="mobile-menu-toggle"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <nav className="header-social-links" aria-label="Social media">
              {siteConfig.socialLinks.map((link) => {
                const SocialIcon = link.id === 'facebook'
                  ? FacebookIcon
                  : link.id === 'youtube'
                    ? YouTubeIcon
                    : InstagramIcon
                return (
                  <a key={link.id} href={link.href} target="_blank" rel="noreferrer" aria-label={link.title} title={link.title}>
                    <SocialIcon aria-hidden="true" />
                  </a>
                )
              })}
            </nav>
          </Toolbar>
        </AppBar>
        <Drawer
          anchor="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          className="mobile-navigation-drawer"
          slotProps={{
            paper: {
              className: 'mobile-navigation-paper',
              'aria-label': 'Mobile navigation',
            },
          }}
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) {
              setMobileMenuOpen(false)
            }
          }}
        >
          <div className="mobile-navigation-header">
            <span className="mobile-navigation-title">Menu</span>
            <IconButton aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </div>
          <nav className="mobile-navigation-links" aria-label="Main navigation">
            <NavigationTree items={siteConfig.topNavigation} variant="top" />
          </nav>
        </Drawer>
        <div className="workspace-layout">
          <main className="main">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              {siteConfig.pages.map((page) => (
                <Route key={page.id} path={page.href} element={<ConfiguredPage page={page} />} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <footer className="footer">
          <span className="footer-copyright">© 2026 {siteConfig.siteName}</span>
        </footer>
      </div>
    </BrowserRouter>
  )
}
