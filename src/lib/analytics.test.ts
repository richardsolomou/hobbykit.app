import { describe, expect, it } from 'vitest'
import { designProperties, settingProperties } from './analytics'
import { defaultWorkspace } from './workspace'

const change = { section: 'Texture', label: 'Depth', advanced: true, method: 'typed' as const }

it('names a setting by its section and label', () => {
  expect(settingProperties(change).setting).toBe('Texture · Depth')
})

it('names a setting outside any section by its label alone', () => {
  expect(settingProperties({ ...change, section: undefined }).setting).toBe('Depth')
})

it('marks an advanced setting', () => {
  expect(settingProperties(change).advanced).toBe(true)
})

it('marks a setting without the advanced flag as main', () => {
  expect(settingProperties({ ...change, advanced: undefined }).advanced).toBe(false)
})

it('says when a change lands back on the default', () => {
  expect(settingProperties({ ...change, value: 1.2, defaultValue: 1.2 }).is_default).toBe(true)
})

it('says when a change moves off the default', () => {
  expect(settingProperties({ ...change, value: 1.5, defaultValue: 1.2 }).is_default).toBe(false)
})

it('leaves out whether a setting is at its default when it has none', () => {
  expect(settingProperties({ ...change, value: 1.5 })).not.toHaveProperty('is_default')
})

it('leaves out the value when an action picked it', () => {
  expect(settingProperties({ ...change, method: 'action' })).not.toHaveProperty('value')
})

it('drops float noise from a stepped value', () => {
  expect(settingProperties({ ...change, value: 0.1 * 3 }).value).toBe(0.3)
})

describe('designProperties', () => {
  const workspace = defaultWorkspace()

  it('names a base by its standard size', () => {
    expect(designProperties(workspace.base).standard_size).toBe('32')
  })

  it('calls a base off the standard range custom', () => {
    expect(designProperties({ ...workspace.base, width: 33 }).standard_size).toBe('custom')
  })

  it('reports a base texture', () => {
    expect(designProperties({ ...workspace.base, texture: { ...workspace.base.texture, pattern: 'flagstone' } }).texture).toBe('flagstone')
  })

  it('says whether a base label is the size, custom text or off', () => {
    expect(designProperties({ ...workspace.base, label: { ...workspace.base.label, text: 'HQ' } }).label).toBe('custom')
  })

  it('counts a holder by its slots', () => {
    const holder = {
      ...workspace.holder,
      groups: [
        { ...workspace.holder.groups[0], quantity: 3 },
        { ...workspace.holder.groups[0], quantity: 2 },
      ],
    }
    expect(designProperties(holder).slots).toBe(5)
  })

  it('counts a paint rack by its modules', () => {
    expect(designProperties(workspace.paintRack).modules).toBe(workspace.paintRack.items.filter((item) => item.kind === 'module').length)
  })

  it('says a token raises its artwork', () => {
    expect(designProperties({ ...workspace.token, emboss: 1 }).relief).toBe('raised')
  })

  it('says a token engraves its artwork', () => {
    expect(designProperties({ ...workspace.token, emboss: -1 }).relief).toBe('engraved')
  })

  it('never sends token text', () => {
    expect(Object.values(designProperties({ ...workspace.token, text: 'Oath of Moment' }))).not.toContain('Oath of Moment')
  })

  it('reports what a counter counts and how it looks, never its text', () => {
    expect(designProperties({ ...workspace.counter, left: { ...workspace.counter.left, text: 'Life' } })).toEqual({
      size: 34.95,
      digits: 'inlaid',
      dials: 2,
      faces: 10,
      first: 0,
      count_down: false,
      mark: 'bar',
      plate_filament: 1,
      plate_text: true,
      plate_image: false,
    })
  })
})
