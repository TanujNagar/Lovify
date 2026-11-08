import { getSetting, removeSetting, setSetting } from '@/lib/db'

export const PROFILE_AVATAR_SETTING = 'profileAvatar'
export const MAX_AVATAR_SOURCE_BYTES = 8 * 1024 * 1024
export const AVATAR_SIZE = 512

export async function getStoredAvatar(): Promise<string | null> {
  const value = await getSetting<string>(PROFILE_AVATAR_SETTING)
  return typeof value === 'string' && value.startsWith('data:image/') ? value : null
}

export async function saveStoredAvatar(dataUrl: string): Promise<void> {
  await setSetting(PROFILE_AVATAR_SETTING, dataUrl)
}

export async function removeStoredAvatar(): Promise<void> {
  await removeSetting(PROFILE_AVATAR_SETTING)
}

/**
 * Reads an image file, squares it from the centre and downsizes it before it
 * ever reaches IndexedDB. The avatar stays on this device.
 */
export function prepareAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choose an image file.'))
      return
    }
    if (file.size > MAX_AVATAR_SOURCE_BYTES) {
      reject(new Error('That image is larger than 8 MB. Choose a smaller one.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('That image could not be read.'))
    reader.onload = () => {
      const source = typeof reader.result === 'string' ? reader.result : ''
      if (!source) {
        reject(new Error('That image could not be read.'))
        return
      }

      const image = new Image()
      image.onerror = () => reject(new Error('That image could not be opened.'))
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = AVATAR_SIZE
          canvas.height = AVATAR_SIZE
          const context = canvas.getContext('2d')
          if (!context) {
            reject(new Error('This browser cannot prepare an image.'))
            return
          }

          const side = Math.min(image.width, image.height)
          const sourceX = Math.max(0, (image.width - side) / 2)
          const sourceY = Math.max(0, (image.height - side) / 2)
          context.drawImage(
            image,
            sourceX,
            sourceY,
            side,
            side,
            0,
            0,
            AVATAR_SIZE,
            AVATAR_SIZE,
          )
          resolve(canvas.toDataURL('image/jpeg', 0.86))
        } catch {
          reject(new Error('That image could not be prepared.'))
        }
      }
      image.src = source
    }
    reader.readAsDataURL(file)
  })
}
