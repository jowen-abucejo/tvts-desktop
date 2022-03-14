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
  disabled = false;
  canShowPane = true;

  constructor(
    private loadingController: LoadingController,
    private auth: AuthenticationService,
    private router: Router
  ) {
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
    await this.auth.logout().catch((err) => {}); //revoke token on api server
    await loading.dismiss();
    this.router.navigateByUrl('login', { replaceUrl: true });
  }

  togglePane() {
    this.disabled = !this.disabled;
  }
}
