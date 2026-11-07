import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'

export function NotFoundScreen() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
      <Icon name="explore" size="lg" className="text-primary" />
      <h1 className="mt-3 font-headline-md text-headline-md text-on-surface">A quiet dead end</h1>
      <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
        That page is not part of Lovify. Let&apos;s get you back to something good.
      </p>
      <Link
        to="/"
        className="mt-5 flex min-h-11 items-center rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
      >
        Back home
      </Link>
    </div>
  )
}
