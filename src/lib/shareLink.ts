import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import { BASE_HASH_PREFIX, readBaseHash, type LinkedBase } from './baseLink'
import { workspaceSetup, type GeneratorSettings, type WorkspaceState } from './workspace'

const HASH_PREFIX = '#setup='
const SHARE_VERSION = 1
/** Past this a link stops pasting cleanly into chat apps, so uploaded images are left out. */
export const MAX_SHARE_URL_LENGTH = 8192

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  return Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (character) => character.charCodeAt(0))
}

function linkFor(page: string, workspace: WorkspaceState, part: GeneratorSettings): string {
  const payload = { v: SHARE_VERSION, ...workspaceSetup(workspace, part) }
  return `${page}${HASH_PREFIX}${toBase64Url(deflateSync(strToU8(JSON.stringify(payload)), { level: 9 }))}`
}

/** `page` is the generator's address without a hash; the setup travels in the hash so no server ever sees it. */
export function shareLink(page: string, workspace: WorkspaceState, part: GeneratorSettings): { url: string; imageOmitted: boolean } {
  const url = linkFor(page, workspace, part)
  const withoutImages = {
    ...workspace,
    token: { ...workspace.token, image: null },
    counter: { ...workspace.counter, left: { ...workspace.counter.left, image: null }, right: { ...workspace.counter.right, image: null } },
  }
  const images =
    part === 'token' ? [workspace.token.image] : part === 'counter' ? [workspace.counter.left.image, workspace.counter.right.image] : []
  if (url.length <= MAX_SHARE_URL_LENGTH || images.every((image) => image === null)) return { url, imageOmitted: false }
  return { url: linkFor(page, withoutImages, part), imageOmitted: true }
}

/** Decodes a share hash into an unvalidated setup, or undefined for any other or unreadable hash. */
export function readShareHash(hash: string): unknown {
  if (!hash.startsWith(HASH_PREFIX)) return undefined
  try {
    const payload = JSON.parse(strFromU8(inflateSync(fromBase64Url(hash.slice(HASH_PREFIX.length))))) as unknown
    if (typeof payload !== 'object' || payload === null || (payload as { v?: unknown }).v !== SHARE_VERSION) return undefined
    return payload
  } catch {
    return undefined
  }
}

export type SharedLink = { setup: unknown } | { base: LinkedBase }

/** Removes a share or base hash from the address so a later reload uses the saved workspace, and returns what it carried. */
export function takeShareHash(): SharedLink | undefined {
  const { hash, pathname, search } = window.location
  if (!hash.startsWith(HASH_PREFIX) && !hash.startsWith(BASE_HASH_PREFIX)) return undefined
  window.history.replaceState(null, '', pathname + search)
  if (hash.startsWith(HASH_PREFIX)) return { setup: readShareHash(hash) }
  const base = readBaseHash(hash)
  return base ? { base } : undefined
}
