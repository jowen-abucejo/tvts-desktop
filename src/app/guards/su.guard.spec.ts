import { TestBed } from '@angular/core/testing';

import { SuGuard } from './su.guard';

describe('SuGuard', () => {
  let guard: SuGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(SuGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
