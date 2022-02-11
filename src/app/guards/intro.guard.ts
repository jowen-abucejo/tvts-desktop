import { Injectable } from '@angular/core';
import { CanLoad, Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { StorageService } from '../services/storage.service';
export const INTRO_KEY = '_hasSeenIntro';
@Injectable({
  providedIn: 'root',
})
export class IntroGuard implements CanLoad {
  constructor(private router: Router, private storage: StorageService) {}
  async canLoad(): Promise<boolean> {
    const seen = await this.storage.get(INTRO_KEY).pipe(take(1)).toPromise();
    if (seen) {
      return true;
    } else {
      this.router.navigateByUrl('intro', { replaceUrl: true });
      return true;
    }
  }
}
