import { TestBed } from '@angular/core/testing';

import { TreasuryGuard } from './treasury.guard';

describe('TreasuryGuard', () => {
  let guard: TreasuryGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(TreasuryGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
