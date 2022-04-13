import { Injectable } from '@angular/core';
import { CanLoad, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthenticationService } from '../services/authentication.service';

@Injectable({
  providedIn: 'root',
})
export class TreasuryGuard implements CanLoad {
  constructor(private auth: AuthenticationService, private router: Router) {}

  canLoad(): Observable<boolean> {
    return this.auth.isTreasury.pipe(
      take(1),
      map((isTreasury) => {
        if (isTreasury) {
          return true;
        } else {
          this.router.navigateByUrl('login', { replaceUrl: true });
        }
      })
    );
  }
}
