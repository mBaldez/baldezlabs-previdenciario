import { render, screen, fireEvent } from '@testing-library/react'
import { MonthYearPicker } from '../../src/components/ui/MonthYearPicker'

describe('MonthYearPicker', () => {
  test('renderiza label quando fornecido', () => {
    render(<MonthYearPicker label="Data de Início" mes={1} ano={2020} onChange={() => {}} />)
    expect(screen.getByText('Data de Início')).toBeInTheDocument()
  })

  test('renderiza dois selects (mês e ano)', () => {
    render(<MonthYearPicker mes={1} ano={2020} onChange={() => {}} />)
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  test('select de mês tem 12 opções', () => {
    render(<MonthYearPicker mes={1} ano={2020} onChange={() => {}} />)
    const [mesSelect] = screen.getAllByRole('combobox')
    expect(mesSelect.options).toHaveLength(12)
  })

  test('chama onChange com novo mês ao mudar', () => {
    const onChange = vi.fn()
    render(<MonthYearPicker mes={1} ano={2020} onChange={onChange} />)
    const [mesSelect] = screen.getAllByRole('combobox')
    fireEvent.change(mesSelect, { target: { value: '6' } })
    expect(onChange).toHaveBeenCalledWith(6, 2020)
  })

  test('chama onChange com novo ano ao mudar', () => {
    const onChange = vi.fn()
    render(<MonthYearPicker mes={3} ano={2020} onChange={onChange} />)
    const [, anoSelect] = screen.getAllByRole('combobox')
    fireEvent.change(anoSelect, { target: { value: '2015' } })
    expect(onChange).toHaveBeenCalledWith(3, 2015)
  })

  test('renderiza helpText quando fornecido', () => {
    render(<MonthYearPicker mes={1} ano={2020} onChange={() => {}} helpText="Ex.: Janeiro/2020" />)
    expect(screen.getByText('Ex.: Janeiro/2020')).toBeInTheDocument()
  })
})
