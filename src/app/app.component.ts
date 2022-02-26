import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
// import { App } from '@capacitor/app';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
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
    private router: Router,
    private platform: Platform,
    private alertController: AlertController
  ) {
    this.auth.isAuthenticated
      .pipe(
        map((isAuthenticated) => {
          this.isAuthenticated = isAuthenticated;
        })
      )
      .subscribe();
    // this.platform.backButton.subscribeWithPriority(-1, (processNextHandler) => {
    //   const url = this.router.url;
    //   if (url === '/home' || url === '/login' || url === '/intro') {
    //     this.router.navigate(['/tabs/home']);
    //     this.showConfirmExit();
    //     processNextHandler();
    //   }
    // });

    // this.platform.backButton.subscribeWithPriority(-2, () => {
    //   const url = this.router.url;
    //   if (url === '/home' || url === '/login' || url === '/intro') {
    //     this.alertController
    //       .getTop()
    //       .then((alert) => {
    //         if (alert) {
    //           alert.dismiss();
    //           App.exitApp();
    //         }
    //       })
    //       .catch((res) => {});
    //   }
    // });
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

  // async showConfirmExit() {
  //   const alert = await this.alertController.create({
  //     header: 'Exit App',
  //     message: 'Are you sure to close the app?',
  //     backdropDismiss: false,
  //     buttons: [
  //       {
  //         text: 'Stay',
  //         role: 'cancel',
  //         handler: () => {
  //           console.log('Application exit prevented!');
  //         },
  //       },
  //       {
  //         text: 'Exit',
  //         handler: () => {
  //           App.exitApp();
  //         },
  //       },
  //     ],
  //   });

  //   await alert.present();
  // }

  togglePane() {
    this.disabled = !this.disabled;
  }
}
