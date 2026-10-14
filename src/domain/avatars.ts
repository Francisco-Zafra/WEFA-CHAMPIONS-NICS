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
  '49_murcielago',
  '50_ornitorrinco',
  '51_topo',
  '52_mofeta',
  '53_castor',
  '54_suricata',
  '55_tucan',
  '56_armadillo',
  '57_gorila',
  '58_canguro',
  '59_pelicano',
  '60_foca',
  '61_hipopotamo',
  '62_langosta',
  '63_caracol',
  '64_pavo_real',
  '65_hormiga',
  '66_mantis',
  '67_mariposa',
  '68_iguana',
  '69_tejon',
  '70_wombat',
  '71_topo_2',
  '72_ornitorrinco_2',
  '73_tanuki',
  '74_guacamayo',
  '75_burro',
  '76_anguila',
  '77_cabra_2',
  '78_murcielago_2',
  '79_camaleon',
  '80_jabali_2',
  '81_langosta_2',
  '82_pavo_real_2',
  '83_hormiga_2',
  '84_abeja',
  '85_buho',
  '86_foca_2',
  '87_bisonte',
  '88_lagarto',
] as const

export type AvatarId = (typeof AVATARS)[number]

export const isAvatarId = (v: unknown): v is AvatarId =>
  typeof v === 'string' && (AVATARS as readonly string[]).includes(v)

export const avatarUrl = (id: AvatarId) => `${import.meta.env.BASE_URL}avatars/${id}.webp`

/** Palabras que en el id van sin tilde */
const ACCENTS: Record<string, string> = {
  murcielago: 'murciélago',
  tucan: 'tucán',
  pelicano: 'pelícano',
  hipopotamo: 'hipopótamo',
  tejon: 'tejón',
  camaleon: 'camaleón',
  jabali: 'jabalí',
  buho: 'búho',
  tiburon: 'tiburón',
  pinguino: 'pingüino',
  raton: 'ratón',
}

/** «20_cocodrilo_2» → «Cocodrilo 2», «59_pelicano» → «Pelícano» */
export function avatarLabel(id: AvatarId): string {
  const text = id
    .replace(/^\d+_/, '')
    .split('_')
    .map((w) => ACCENTS[w] ?? w)
    .join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
