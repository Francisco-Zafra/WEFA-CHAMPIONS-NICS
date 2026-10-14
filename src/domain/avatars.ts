/** Avatares predefinidos (public/avatars/<id>.webp). Primero las mascotas de los clubes */
export const AVATARS = [
  '41_avispa',
  '42_escarabajo',
  '43_flamenco_2',
  '44_jabali',
  '45_panda_2',
  '46_pato_2',
  '47_pinguino_2',
  '48_tiburon_2',
  '01_cocodrilo',
  '02_gaviota',
  '03_gato',
  '04_perro',
  '05_mapache',
  '06_tiburon',
  '07_pinguino',
  '08_llama',
  '09_vaca',
  '10_rana',
  '11_flamenco',
  '12_capibara',
  '13_panda',
  '14_gallo',
  '15_corgi',
  '16_perezoso',
  '17_pulpo',
  '18_pato',
  '19_mono',
  '20_cocodrilo_2',
  '21_koala',
  '22_tigre',
  '23_dinosaurio',
  '24_cabra',
  '25_caballo',
  '26_erizo',
  '27_conejo',
  '28_cerdo',
  '29_toro',
  '30_cuervo',
  '31_tortuga',
  '32_morsa',
  '33_jirafa',
  '34_pez',
  '35_lemur',
  '36_oso_polar',
  '37_carnero',
  '38_paloma',
  '39_ajolote',
  '40_zorro',
] as const

export type AvatarId = (typeof AVATARS)[number]

export const isAvatarId = (v: unknown): v is AvatarId =>
  typeof v === 'string' && (AVATARS as readonly string[]).includes(v)

export const avatarUrl = (id: AvatarId) => `${import.meta.env.BASE_URL}avatars/${id}.webp`

/** «20_cocodrilo_2» → «Cocodrilo 2» */
export function avatarLabel(id: AvatarId): string {
  const words = id.replace(/^\d+_/, '').split('_')
  const text = words.join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
