import { test } from '@japa/runner'
import { toLocalDateKey, getWeekStart } from '#utils/date'

test.group('toLocalDateKey', () => {
  test('форматирует дату как YYYY-MM-DD', ({ assert }) => {
    const date = new Date(2024, 0, 5) // 5 Jan 2024
    assert.equal(toLocalDateKey(date), '2024-01-05')
  })

  test('дополняет месяц и день нулями', ({ assert }) => {
    assert.equal(toLocalDateKey(new Date(2024, 8, 3)), '2024-09-03') // Sep 3
  })

  test('декабрь → месяц 12', ({ assert }) => {
    assert.equal(toLocalDateKey(new Date(2024, 11, 31)), '2024-12-31')
  })

  test('январь → месяц 01', ({ assert }) => {
    assert.equal(toLocalDateKey(new Date(2025, 0, 1)), '2025-01-01')
  })
})

test.group('getWeekStart', () => {
  test('понедельник → тот же день, время 00:00:00', ({ assert }) => {
    const monday = new Date(2025, 2, 3, 15, 30) // Mon 3 Mar 2025, 15:30
    const ws = getWeekStart(monday)
    assert.equal(toLocalDateKey(ws), '2025-03-03')
    assert.equal(ws.getHours(), 0)
    assert.equal(ws.getMinutes(), 0)
    assert.equal(ws.getSeconds(), 0)
  })

  test('среда → предыдущий понедельник', ({ assert }) => {
    const wednesday = new Date(2025, 2, 5) // Wed 5 Mar 2025
    assert.equal(toLocalDateKey(getWeekStart(wednesday)), '2025-03-03')
  })

  test('воскресенье → предыдущий понедельник', ({ assert }) => {
    const sunday = new Date(2025, 2, 9) // Sun 9 Mar 2025
    assert.equal(toLocalDateKey(getWeekStart(sunday)), '2025-03-03')
  })

  test('суббота → предыдущий понедельник', ({ assert }) => {
    const saturday = new Date(2025, 2, 8) // Sat 8 Mar 2025
    assert.equal(toLocalDateKey(getWeekStart(saturday)), '2025-03-03')
  })

  test('не мутирует исходную дату', ({ assert }) => {
    const date = new Date(2025, 2, 5, 12, 0, 0)
    const original = date.getTime()
    getWeekStart(date)
    assert.equal(date.getTime(), original)
  })
})
