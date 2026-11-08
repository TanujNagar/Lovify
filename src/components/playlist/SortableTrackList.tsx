import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@/components/brand/Icon'
import { TrackRow } from '@/components/media/TrackRow'
import { cn } from '@/lib/cn'
import type { Track } from '@/types/music'

type SortableTrackListProps = {
  tracks: Track[]
  onReorder: (from: number, to: number) => void
  playlistId?: string | null
  className?: string
}

export function SortableTrackList({
  tracks,
  onReorder,
  playlistId,
  className,
}: SortableTrackListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // A small threshold keeps vertical scrolling usable on touch screens
      // while still feeling immediate for a deliberate drag.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = tracks.findIndex((track) => track.id === active.id)
    const to = tracks.findIndex((track) => track.id === over.id)
    if (from < 0 || to < 0) return
    onReorder(from, to)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={tracks.map((track) => track.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={cn('flex flex-col gap-1.5', className)}>
          {tracks.map((track, index) => (
            <SortableTrackRow
              key={track.id}
              track={track}
              index={index}
              queue={tracks}
              playlistId={playlistId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableTrackRow({
  track,
  index,
  queue,
  playlistId,
}: {
  track: Track
  index: number
  queue: Track[]
  playlistId?: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'relative rounded-xl',
        isDragging && 'z-20 opacity-95 shadow-[0_18px_40px_rgba(0,0,0,0.45)]',
      )}
    >
      <TrackRow
        track={track}
        queue={queue}
        showIndex={index + 1}
        showAlbum
        playlistId={playlistId}
        className={isDragging ? 'ring-1 ring-primary-container/60' : undefined}
        actions={
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${track.title}. Press Space, then use the arrow keys, then Space again.`}
            className="flex h-11 w-11 touch-none select-none items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container active:cursor-grabbing"
          >
            <Icon name="drag_indicator" size="sm" />
          </button>
        }
      />
    </div>
  )
}
