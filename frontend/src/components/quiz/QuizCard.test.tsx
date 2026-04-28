import { render, screen, fireEvent } from '@testing-library/react'
// @ts-ignore
import { axe } from 'jest-axe'
import { QuizCard } from './QuizCard'
import { vi, test, expect } from 'vitest'

const mockQuestion = {
  question: 'What is compulsory voting?',
  options: ['Enrolling', 'Voting', 'Both', 'Neither'],
  correct: 2,
  explanation: 'Both enrolling and voting are compulsory in Australia.'
}

test('renders question text', () => {
  render(<QuizCard question={mockQuestion} onAnswer={() => {}} />)
  expect(screen.getByText('What is compulsory voting?')).toBeInTheDocument()
})

test('renders 4 options', () => {
  render(<QuizCard question={mockQuestion} onAnswer={() => {}} />)
  expect(screen.getAllByRole('radio')).toHaveLength(4)
})

test('calls onAnswer after selection', async () => {
  vi.useFakeTimers()
  const onAnswer = vi.fn()
  render(<QuizCard question={mockQuestion} onAnswer={onAnswer} />)
  fireEvent.click(screen.getAllByRole('radio')[0])
  vi.advanceTimersByTime(800)
  expect(onAnswer).toHaveBeenCalledWith(0)
  vi.useRealTimers()
})

test('has no axe violations', async () => {
  const { container } = render(<QuizCard question={mockQuestion} onAnswer={() => {}} />)
  const results = await axe(container)
  // @ts-ignore
  expect(results).toHaveNoViolations()
})
