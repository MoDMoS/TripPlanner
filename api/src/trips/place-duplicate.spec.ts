import { isDuplicatePlace } from './place-duplicate';

describe('isDuplicatePlace', () => {
  it('detects near-identical places', () => {
    expect(
      isDuplicatePlace(
        { name: 'Taipei 101', lat: 25.033, lng: 121.5654 },
        { name: 'taipei 101', lat: 25.03301, lng: 121.56541 },
      ),
    ).toBe(true);
  });

  it('allows different names at same spot', () => {
    expect(
      isDuplicatePlace(
        { name: 'Taipei 101', lat: 25.033, lng: 121.5654 },
        { name: 'Mall', lat: 25.03301, lng: 121.56541 },
      ),
    ).toBe(false);
  });
});
