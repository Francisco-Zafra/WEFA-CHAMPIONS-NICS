import { describe, expect, it } from 'vitest'
import { AVATARS, avatarLabel, isAvatarId } from './avatars'

describe('avatares', () => {
  it('ids únicos y reconocibles', () => {
    expect(new Set(AVATARS).size).toBe(AVATARS.length)
    expect(isAvatarId('59_pelicano')).toBe(true)
    expect(isAvatarId('no_existe')).toBe(false)
  })

  it('nombres legibles con tildes', () => {
    expect(avatarLabel('20_cocodrilo_2')).toBe('Cocodrilo 2')
    expect(avatarLabel('59_pelicano')).toBe('Pelícano')
    expect(avatarLabel('64_pavo_real')).toBe('Pavo real')
    expect(avatarLabel('85_buho')).toBe('Búho')
  })
})
