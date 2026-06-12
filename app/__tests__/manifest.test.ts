import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../manifest';

describe('manifest', () => {
  describe('ShapeContract', () => {
    it('Invoked_ReturnsNameCtrlPlusList', () => {
      expect(manifest().name).toBe('Ctrl+List');
    });

    it('Invoked_ReturnsShortNameCtrlPlusList', () => {
      expect(manifest().short_name).toBe('Ctrl+List');
    });

    it('Invoked_ReturnsDescriptionMatchingRootMetadata', () => {
      expect(manifest().description).toBe(
        'Create and share your lists with friends and family',
      );
    });

    it('Invoked_ReturnsIdStartUrlScopeRoot', () => {
      const result = manifest();
      expect(result.id).toBe('/');
      expect(result.start_url).toBe('/');
      expect(result.scope).toBe('/');
    });

    it('Invoked_ReturnsDisplayStandalone-OrientationPortrait', () => {
      const result = manifest();
      expect(result.display).toBe('standalone');
      expect(result.orientation).toBe('portrait');
    });

    it('Invoked_ReturnsThemeAndBackgroundColor25194e', () => {
      const result = manifest();
      expect(result.background_color).toBe('#25194e');
      expect(result.theme_color).toBe('#25194e');
    });

    it('Invoked_DeclaresNoWebPushFields', () => {
      expect(manifest()).not.toHaveProperty('gcm_sender_id');
    });
  });

  describe('IconMatrix', () => {
    it('Icons_ContainsExactlyFourEntries', () => {
      expect(manifest().icons).toHaveLength(4);
    });

    it('Icons_Has192Any-And192Maskable', () => {
      const icons = manifest().icons ?? [];
      expect(icons).toContainEqual({
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      });
      expect(icons).toContainEqual({
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      });
    });

    it('Icons_Has512Any-And512Maskable', () => {
      const icons = manifest().icons ?? [];
      expect(icons).toContainEqual({
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      });
      expect(icons).toContainEqual({
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      });
    });

    it('Icons_EverySrcResolvesToExistingPublicFile', () => {
      const icons = manifest().icons ?? [];
      for (const icon of icons) {
        expect(existsSync(join(process.cwd(), 'public', icon.src))).toBe(true);
      }
    });
  });
});
