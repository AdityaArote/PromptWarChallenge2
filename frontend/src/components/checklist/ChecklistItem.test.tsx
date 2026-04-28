import { render, screen, fireEvent } from '@testing-library/react'
// @ts-ignore
import { axe } from 'jest-axe'
import { ChecklistItemComponent } from './ChecklistItem'
import { vi, test, expect } from 'vitest'

const mockItem = { id: '1', item_id: 'check_registration', label: 'Check voter registration', completed: false, completed_at: null }

test('renders label', () => {
  render(<ChecklistItemComponent item={mockItem} onToggle={() => {}} />)
  expect(screen.getByText('Check voter registration')).toBeInTheDocument()
})

test('calls onToggle on click', () => {
  const onToggle = vi.fn()
  render(<ChecklistItemComponent item={mockItem} onToggle={onToggle} />)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(onToggle).toHaveBeenCalledWith('check_registration', true)
})

test('shows completed state', () => {
  const completedItem = { ...mockItem, completed: true }
  render(<ChecklistItemComponent item={completedItem} onToggle={() => {}} />)
  expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
})

test('has no axe violations', async () => {
  const { container } = render(<ChecklistItemComponent item={mockItem} onToggle={() => {}} />)
  const results = await axe(container)
  // @ts-ignore
  expect(results).toHaveNoViolations()
})
