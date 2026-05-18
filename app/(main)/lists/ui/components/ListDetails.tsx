import { ListTable } from '@/lib/types';
import Link from 'next/link';
import {
  MdChecklist,
  MdModeEdit,
  MdPreview,
  MdVisibility,
} from 'react-icons/md';
import DeleteListButton from './DeleteListButton';
import ListActionsMenu from './ListActionsMenu';
import ListHeader from './ListHeader';
import SaveContainer from './SaveContainer';
import ShareButton from './ShareButton';
import ShareList from './ShareList';
import SpoilerToggle from './SpoilerToggle';

export default function ListDetails({
  isOwner,
  list,
  user_name,
  user_id,
  showSpoilers,
  previewMode,
}: {
  isOwner: boolean;
  list: ListTable;
  user_name: string | undefined;
  user_id: string | undefined;
  showSpoilers?: boolean;
  previewMode?: boolean;
}) {
  const previewHref = `/lists/${list.id}?preview=viewer${
    showSpoilers ? '&spoilers=1' : ''
  }`;
  const exitPreviewHref = `/lists/${list.id}${showSpoilers ? '?spoilers=1' : ''}`;
  // Spoiler toggle preserves preview state
  const spoilerHref = showSpoilers
    ? `/lists/${list.id}${previewMode ? '?preview=viewer' : ''}`
    : `/lists/${list.id}?${previewMode ? 'preview=viewer&' : ''}spoilers=1`;

  return (
    <div className="list-details">
      {previewMode && (
        <div className="preview-banner" role="status">
          <MdVisibility />
          <span>You&apos;re previewing this list as a viewer.</span>
          <Link href={exitPreviewHref} className="btn secondary">
            Exit preview
          </Link>
        </div>
      )}

      {/* Mobile top row: privacy + share + kebab side-by-side */}
      <div className="list-top-row">
        {isOwner && !previewMode && <ShareList list={list} />}
        <div className="list-actions list-actions-mobile">
          {!previewMode && <ShareButton list={list} />}
          {isOwner && (
            <ListActionsMenu
              listId={list.id}
              showSpoilers={!!showSpoilers}
              previewMode={!!previewMode}
              spoilerHref={spoilerHref}
              previewHref={previewHref}
              exitPreviewHref={exitPreviewHref}
            />
          )}
          {!isOwner && user_id && (
            <SaveContainer list_id={list.id} user_id={user_id} />
          )}
        </div>
      </div>

      <ListHeader title={list.name} user_name={user_name || null} list={list}>
        {/* Desktop: labeled sections */}
        <div className="list-actions list-actions-desktop">
          {!previewMode && (
            <section className="list-section">
              <div className="list-section-label">Share</div>
              <ShareButton list={list} />
            </section>
          )}

          {isOwner && (
            <section className="list-section">
              <div className="list-section-label">View as</div>
              {!previewMode && (
                <Link
                  className="btn secondary"
                  href={previewHref}
                  title="Preview as a viewer"
                >
                  <MdPreview />
                  <span className="label">Preview as viewer</span>
                </Link>
              )}
              <SpoilerToggle showSpoilers={!!showSpoilers} />
            </section>
          )}

          {isOwner && !previewMode && (
            <section className="list-section">
              <div className="list-section-label">Manage</div>
              <Link
                className="btn secondary"
                href={`/lists/${list.id}/choose-items`}
              >
                <MdChecklist size={18} />
                <span className="label">Choose items</span>
              </Link>
              <Link className="btn primary" href={`/lists/${list.id}/edit`}>
                <MdModeEdit />
                <span className="label">Edit list</span>
              </Link>
              <DeleteListButton id={list.id} />
            </section>
          )}

          {!isOwner && user_id && (
            <section className="list-section">
              <SaveContainer list_id={list.id} user_id={user_id} />
            </section>
          )}
        </div>
      </ListHeader>
    </div>
  );
}
