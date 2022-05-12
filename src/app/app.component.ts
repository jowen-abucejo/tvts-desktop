import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { map } from 'rxjs/operators';
import { AuthenticationService } from './services/authentication.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.canShowPane = window.innerWidth >= 1200; //check if on lg screens
  }
  isAuthenticated = false;
  isAdmin = false;
  isTreasury = false;

  disabled = false;
  canShowPane = true;

  constructor(
    private loadingController: LoadingController,
    private auth: AuthenticationService,
    private router: Router
  ) {
    this.auth.isAdmin
      .pipe(
        map((isAdmin) => {
          this.isAdmin = isAdmin;
        })
      )
      .subscribe();

    this.auth.isTreasury
      .pipe(
        map((isTreasury) => {
          this.isTreasury = isTreasury;
        })
      )
      .subscribe();
    this.auth.isAuthenticated
      .pipe(
        map((isAuthenticated) => {
          this.isAuthenticated = isAuthenticated;
        })
      )
      .subscribe();
  }

  async logout() {
    const loading = await this.loadingController.create({
      spinner: 'bubbles',
      message: 'Please wait...',
    });
    await loading.present();
    await this.auth.logout().then(
      () => {},
      (err) => {}
    ); //revoke token on api server
    this.router
      .navigateByUrl('login', { replaceUrl: true })
      .finally(async () => {
        await loading.dismiss();
        window.location.reload();
      });
  }

  togglePane() {
    this.disabled = !this.disabled;
  }
}
