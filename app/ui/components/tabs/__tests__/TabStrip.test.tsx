/* eslint-disable testing-library/no-node-access --
 * `.tabs-shell` is a class-only contract: it carries the caller's className and
 * is the container query's container. No role reaches it, so a classed
 * `document` query is the only way to assert it.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TabStrip } from '../TabStrip';

// jsdom reports every box as 0 wide, so the strip always fits and never
// collapses. Widening the row past its shell is the only way to reach the
// collapsed behavior.
const forceCollapse = () => {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
};

const renderCollapsedAndOpen = async () => {
  forceCollapse();
  render(
    <TabStrip role="tablist" aria-label="Filter">
      <button type="button" role="tab" aria-selected>
        Active
      </button>
    </TabStrip>
  );
  await userEvent.click(screen.getByRole('tab', { name: 'Active' }));
  return document.querySelector('.tabs-shell') as HTMLElement;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TabStrip', () => {
  it('RoleNavigation_ExposesNavigationLandmarkAndNoTablist', () => {
    render(
      <TabStrip role="navigation" aria-label="List collections">
        <a href="#lists">My Lists</a>
      </TabStrip>
    );

    expect(
      screen.getByRole('navigation', { name: 'List collections' })
    ).toContainElement(screen.getByRole('link', { name: 'My Lists' }));
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('RoleTablist_ExposesTablistAndNoNavigationLandmark', () => {
    render(
      <TabStrip role="tablist" aria-label="Filter">
        <button type="button" role="tab" aria-selected>
          Active
        </button>
      </TabStrip>
    );

    expect(screen.getByRole('tablist', { name: 'Filter' })).toContainElement(
      screen.getByRole('tab', { name: 'Active' })
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('SizeOmitted_EmitsTabsDefaultClass', () => {
    render(
      <TabStrip role="navigation" aria-label="List collections">
        <a href="#lists">My Lists</a>
      </TabStrip>
    );

    expect(screen.getByRole('navigation')).toHaveAttribute(
      'class',
      'tabs tabs--default'
    );
    expect(document.querySelector('.tabs-shell')).toHaveAttribute(
      'class',
      'tabs-shell'
    );
  });

  it('SizeSm_EmitsTabsSmClass-KeepsCallerClassName', () => {
    render(
      <TabStrip
        role="tablist"
       
        size="sm"
        className="items-tabs"
        aria-label="Filter"
      >
        <button type="button" role="tab" aria-selected />
      </TabStrip>
    );

    expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs--sm');
    expect(screen.getByRole('tablist')).not.toHaveClass('tabs--default');
    expect(document.querySelector('.tabs-shell')).toHaveClass(
      'tabs-shell',
      'items-tabs'
    );
  });

  it('OnKeyDownGiven_ForwardsKeysToTheHandler', async () => {
    const onKeyDown = vi.fn();
    render(
      <TabStrip role="tablist" aria-label="Filter" onKeyDown={onKeyDown}>
        <button type="button" role="tab" aria-selected>
          Active
        </button>
      </TabStrip>
    );

    screen.getByRole('tab', { name: 'Active' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onKeyDown).toHaveBeenCalled();
  });

  it('CollapsedFaceClicked_TogglesTheListOpenThenShut', async () => {
    const shell = await renderCollapsedAndOpen();

    expect(shell).toHaveAttribute('data-collapsed', 'true');
    expect(shell).toHaveAttribute('data-open', 'true');

    await userEvent.click(screen.getByRole('tab', { name: 'Active' }));

    expect(shell).not.toHaveAttribute('data-open');
  });

  it('OpenAndPointerDownOutside_ClosesTheList', async () => {
    const shell = await renderCollapsedAndOpen();

    await userEvent.click(document.body);

    expect(shell).not.toHaveAttribute('data-open');
  });

  it('OpenAndEscapePressed_ClosesTheList', async () => {
    const shell = await renderCollapsedAndOpen();

    await userEvent.keyboard('{Escape}');

    expect(shell).not.toHaveAttribute('data-open');
  });

  it('ExpandedFaceClicked_LeavesTheListShut', async () => {
    render(
      <TabStrip role="tablist" aria-label="Filter">
        <button type="button" role="tab" aria-selected>
          Active
        </button>
      </TabStrip>
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Active' }));

    expect(document.querySelector('.tabs-shell')).not.toHaveAttribute(
      'data-open'
    );
  });
});
