import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialMarketplaceState } from '../data/marketplaceCatalog';
import {
  getCardReviewDisplay,
  selectPopularDevices,
  shouldShowDemoControls,
} from './homeUiPolicy';

test('shouldShowDemoControls hides Demo button for ordinary customers in production', () => {
  assert.equal(
    shouldShowDemoControls({ role: 'visitor', isDev: false, search: '' }),
    false
  );
  assert.equal(
    shouldShowDemoControls({ role: 'buyer', isDev: false, search: '' }),
    false
  );
  assert.equal(
    shouldShowDemoControls({ role: 'seller_approved', isDev: false, search: '' }),
    false
  );
  assert.equal(
    shouldShowDemoControls({ role: 'visitor', isDev: true, search: '?prod_preview=1' }),
    false
  );
});

test('shouldShowDemoControls shows Demo button only in authorized admin/preview/dev contexts', () => {
  assert.equal(
    shouldShowDemoControls({ role: 'admin', isDev: false, search: '' }),
    true
  );
  assert.equal(
    shouldShowDemoControls({ role: 'visitor', isDev: false, search: '?demo=1' }),
    true
  );
  assert.equal(
    shouldShowDemoControls({ role: 'visitor', isDev: false, search: '?preview=1' }),
    true
  );
  assert.equal(
    shouldShowDemoControls({
      role: 'visitor',
      isDev: false,
      search: '',
      hasSessionDemoFlag: true,
    }),
    true
  );
  assert.equal(
    shouldShowDemoControls({ role: 'visitor', isDev: true, search: '' }),
    true
  );
});

test('getCardReviewDisplay never fabricates missing modelRating or reviewCount', () => {
  const seed = createInitialMarketplaceState();
  const baseListing = seed.listings[0];

  const withRatings = getCardReviewDisplay({
    ...baseListing,
    modelRating: 4.89,
    modelReviewCount: 114,
    sellerRating: 4.9,
  });
  assert.equal(withRatings.modelRating, 4.89);
  assert.equal(withRatings.modelReviewCount, 114);
  assert.equal(withRatings.sellerRating, 4.9);

  const withoutModelRatings = getCardReviewDisplay({
    ...baseListing,
    modelRating: undefined,
    modelReviewCount: undefined,
    sellerRating: 4.8,
    views: 350,
  });
  assert.equal(withoutModelRatings.modelRating, null);
  assert.equal(withoutModelRatings.modelReviewCount, null);
  assert.equal(withoutModelRatings.sellerRating, 4.8);
});

test('selectPopularDevices selects real existing listings deterministically within limit', () => {
  const seed = createInitialMarketplaceState();
  const popular = selectPopularDevices(seed.listings, 4);
  assert.equal(popular.length, 4);
  const ids = new Set(popular.map((d) => d.id));
  assert.equal(ids.size, 4);
  assert.ok(popular.every((d) => seed.listings.some((s) => s.id === d.id)));
});
