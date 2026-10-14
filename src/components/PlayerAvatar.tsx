import type { CSSProperties } from 'react'
import { avatarUrl } from '@/domain/avatars'
import { initials } from '@/domain/rating'
import type { Player } from '@/domain/types'
import { cx } from '@/lib/cx'

/** Círculo con el avatar del jugador; sin avatar, sus iniciales */
export function PlayerAvatar({
  player,
  className,
  style,
}: {
  player: Pick<Player, 'name'> & { avatar?: Player['avatar'] }
  className?: string
  style?: CSSProperties
}) {
  return (
    <span className={cx('avatar overflow-hidden', className)} style={style} aria-hidden>
      {player.avatar ? (
        <img src={avatarUrl(player.avatar)} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        initials(player.name)
      )}
    </span>
  )
}
