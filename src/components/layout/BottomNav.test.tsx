import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'

describe('BottomNav', () => {
  it('renders every primary destination', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', { name: 'Main Navigation' })
    expect(nav).toBeInTheDocument()
    for (const label of ['Home', 'Search', 'Explore', 'Library', 'Profile']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('marks only the current tab as active', () => {
    render(
      <MemoryRouter initialEntries={['/library']}>
        <BottomNav />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByRole('link', { name: 'Library' })).toHaveClass(
      'text-primary-container',
    )
  })
})
