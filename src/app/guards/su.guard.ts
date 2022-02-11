import { Injectable } from '@angular/core';
import { CanLoad, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthenticationService } from '../services/authentication.service';

@Injectable({
  providedIn: 'root',
})
export class SuGuard implements CanLoad {
  constructor(private auth: AuthenticationService, private router: Router) {}

  canLoad(): Observable<boolean> {
    return this.auth.isSuAuthenticated.pipe(
      take(1),
      map((isSuAuthenticated) => {
        if (isSuAuthenticated) {
          return true;
        } else {
          this.router.navigateByUrl('login', { replaceUrl: true });
        }
      })
    );
  }
}
