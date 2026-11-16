import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import packageJson from '../../package.json' with { type: 'json' }
import { postHogEnvironment, serviceName } from '../contracts/posthog'
import { PostHogIntegration, postHogOptions } from './posthog'

const environment = postHogEnvironment({ projectToken: 'phc_test', host: 'https://eu.i.posthog.com' })!
const options = postHogOptions(environment, 'app.example', 'production')

describe('postHogOptions', () => {
  it('sends straight to the configured PostHog host', () => {
    expect(options.api_host).toBe('https://eu.i.posthog.com')
  })

  it('links the toolbar to the project region', () => {
    expect(options.ui_host).toBe('https://eu.posthog.com')
  })

  it('pins the SDK defaults snapshot', () => {
    expect(options.defaults).toBe('2026-05-30')
  })

  it('creates person profiles only for identified users', () => {
    expect(options.person_profiles).toBe('identified_only')
  })

  it('captures exceptions', () => {
    expect(options.capture_exceptions).toBe(true)
  })

  it('masks token query parameters in captured URLs', () => {
    expect([options.mask_personal_data_properties, options.custom_personal_data_properties]).toEqual([true, ['token']])
  })

  it('masks every input in session replay', () => {
    expect(options.session_recording).toEqual({ maskAllInputs: true })
  })

  it('adds tracing headers only to requests to this application', () => {
    expect(options.tracing_headers).toEqual(['app.example'])
  })

  it('names and versions the service for logs and metrics', () => {
    const service = { serviceName, serviceVersion: packageJson.version, environment: 'production' }
    expect([options.logs, options.metrics]).toEqual([service, service])
  })

  it('leaves console capture off', () => {
    expect(options.logs).not.toHaveProperty('captureConsoleLogs')
  })
})

describe('PostHogIntegration', () => {
  it('renders its children when PostHog is off', () => {
    expect(renderToStaticMarkup(<PostHogIntegration>application</PostHogIntegration>)).toBe('application')
  })
})
