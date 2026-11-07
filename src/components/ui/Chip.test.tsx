import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Chip } from '@/components/ui/Chip'

describe('Chip', () => {
  it('renders its label and reflects the active state', () => {
    render(
      <Chip active icon="bedtime">
        Night Focus
      </Chip>,
    )

    const chip = screen.getByRole('button', { name: /Night Focus/i })
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls the click handler', () => {
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>Music</Chip>)

    fireEvent.click(screen.getByRole('button', { name: 'Music' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Music' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
