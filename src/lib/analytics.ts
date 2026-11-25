import { posthog } from 'posthog-js'
import { createContext, useContext, useRef, type FocusEvent } from 'react'
import { footprint } from '../core/geometry/outline'
import { SIZES_BY_SHAPE } from '../core/geometry/presets'
import type { PartConfig } from '../core/geometry/types'

/** The panel section a control renders in, so a setting is named by where it sits as well as its label. */
export const SectionContext = createContext<string | undefined>(undefined)

/** How a change was made: picked from a choice, flipped, typed, dragged on its label, reset, or set by a button in the input. */
export type SettingMethod = 'picked' | 'toggled' | 'typed' | 'scrubbed' | 'reset' | 'action'

export interface SettingChange {
  section: string | undefined
  label: string
  advanced: boolean | undefined
  method: SettingMethod
  value?: string | number | boolean
  defaultValue?: string | number | boolean
}

/** `setting_changed` properties; `setting` carries the section too, since labels such as Depth repeat across sections. */
export function settingProperties({ section, label, advanced, method, value: raw, defaultValue }: SettingChange) {
  // Stepped values carry float noise (0.1 × 3), which would split one figure into several in a breakdown.
  const value = typeof raw === 'number' ? Number(raw.toFixed(6)) : raw
  return {
    setting: section ? `${section} · ${label}` : label,
    section,
    advanced: Boolean(advanced),
    method,
    ...(value === undefined ? {} : { value }),
    ...(raw === undefined || defaultValue === undefined ? {} : { is_default: raw === defaultValue }),
  }
}

/**
 * Reports one finished change to a setting, never each step of a drag or each keystroke, so counts mean decisions. The
 * generator on screen and whether advanced settings show ride along as super properties.
 */
export function useSettingChanged(label: string, advanced?: boolean) {
  const section = useContext(SectionContext)
  return (change: Omit<SettingChange, 'section' | 'label' | 'advanced'>) =>
    posthog.capture('setting_changed', settingProperties({ section, label, advanced, ...change }))
}

/**
 * Focus and blur handlers for a text setting, reporting it once when it is left changed. The value sent is the text's
 * length, never the text, which is the person's own. Takes its section by name, since the panel holding it renders the
 * section rather than sitting inside one.
 */
export function useTextSettingChanged(section: string, label: string) {
  const focusedAt = useRef('')
  return {
    onFocus: (event: FocusEvent<HTMLInputElement>) => {
      focusedAt.current = event.currentTarget.value
    },
    onBlur: (event: FocusEvent<HTMLInputElement>) => {
      const text = event.currentTarget.value
      if (text === focusedAt.current) return
      posthog.capture('setting_changed', settingProperties({ section, label, advanced: false, method: 'typed', value: text.length }))
    },
  }
}

type DesignProperties = Record<string, string | number | boolean>

/**
 * The choices that define a downloaded part, sent with its download event so the dashboard shows what people print, not
 * only what they try. Typed text never leaves: a label or token says only whether it has any.
 */
export function designProperties(config: PartConfig): DesignProperties {
  switch (config.kind) {
    case 'holder':
      return {
        groups: config.groups.length,
        slots: config.groups.reduce((total, group) => total + group.quantity, 0),
        shapes: [...new Set(config.groups.map((group) => group.shape))].sort().join(','),
        split_groups: config.splitGroups,
        magnets: config.magnets.enabled,
        labels: config.engraving.enabled,
      }
    case 'painting-tray':
      return { rows: config.rows, columns: config.columns, handle: config.handle.shape }
    case 'paint-rack':
      return {
        modules: config.items.filter((item) => item.kind === 'module').length,
        corners: config.items.filter((item) => item.kind === 'corner').length,
        ends: Number(config.leftEnd) + Number(config.rightEnd),
        rows: config.rows,
        pot_pockets: config.pocketDepth > 0,
      }
    case 'stem':
      return { connection: config.connection, body_height: config.bodyHeight }
    case 'token':
      return {
        shape: config.shape,
        size: config.size,
        text: config.text.trim() !== '',
        image: config.image !== null,
        relief: config.emboss > 0 ? 'raised' : config.emboss < 0 ? 'engraved' : 'flat',
        edge: config.profile,
      }
    case 'counter':
      return {
        size: config.size,
        digits: config.digits,
        dials: config.dials,
        faces: config.faces,
        first: config.first,
        count_down: config.countDown,
        mark: config.mark,
        plate_filament: config.plateFilament,
        plate_text: Boolean(config.left.text.trim() || config.right.text.trim()),
        plate_image: Boolean(config.left.image || config.right.image),
      }
    default: {
      const { width, length } = footprint(config)
      const standard = SIZES_BY_SHAPE[config.shape].find((size) => size.width === width && (size.length ?? size.width) === length)
      return {
        shape: config.shape,
        standard_size: standard?.label ?? 'custom',
        texture: config.texture.pattern,
        edge: config.profile,
        solid: config.solid,
        magnets: config.magnets.count,
        label: !config.label.enabled ? 'off' : config.label.text ? 'custom' : 'size',
      }
    }
  }
}
