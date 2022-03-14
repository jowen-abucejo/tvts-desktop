import { Injectable } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root',
})
export class UtilityService {
  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthenticationService
  ) {}

  async alertReLogin(reload_page: boolean = false) {
    const options = {
      inputs: [
        {
          name: 'username',
          type: 'text',
          placeholder: 'Enter username',
        },
        {
          name: 'password',
          type: 'password',
          placeholder: 'Enter password',
        },
      ],
      buttons: [
        {
          text: 'Login',
          cssClass: 'secondary',
          handler: async (credentials) => {
            if (credentials.username && credentials.password) {
              const loading = await this.createIonLoading();
              loading.present();
              this.authService
                .login(credentials.username, credentials.password, true)
                .then(
                  async (res) => {
                    loading.dismiss();
                    const alert = await this.alertMessage('Login Success!');
                    alert.present().finally(() => {
                      if (reload_page) window.location.reload();
                    });
                  },

                  //show error message
                  async (res) => {
                    loading.dismiss();
                    const alert = await this.alertMessage(
                      res.error.error,
                      res.error.message
                    );
                    alert.present();
                  }
                );
              loading.dismiss();
            } else {
              const alert = await this.alertMessage('Login Failed!');
              alert.present();
            }
          },
        },
      ],
    };
    const alert = await this.alertMessage(
      'Login Session Expired!',
      "Please re-login to continue.<br><br><small>Letters, numbers and '@$_.' only are allowed.</small>",
      options
    );
    await alert.present();
  }

  async createIonLoading(
    message: string = 'Please wait...',
    spinner: any = 'bubbles',
    other_options: any = { backdropDismiss: false }
  ) {
    const loading = await this.loadingController.create({
      ...other_options,
      spinner: spinner,
      message: other_options?.message
        ? `${message} ${other_options?.message}`
        : message,
    });
    return loading;
  }

  async alertMessage(
    header: string,
    message: string = '',
    other_options: any = {}
  ) {
    const alert = await this.alertController.create({
      ...other_options,
      header: other_options?.header
        ? `${header} ${other_options?.header}`
        : header,
      message: other_options.message
        ? `${message} ${other_options?.message}`
        : message,
      buttons: [...(other_options?.buttons ? other_options.buttons : ['OK'])],
    });
    return alert;
  }

  async alertErrorStatus(
    response: any,
    re_login: boolean = true,
    reload_page = false
  ) {
    console.log(
      '🚀 ~ file: utility.service.ts ~ line 107 ~ UtilityService ~ alertErrorStatus ~ response',
      response
    );
    if (response.status === 401 && re_login) {
      await this.alertReLogin(reload_page);
    } else if (
      (response.status === 401 && !re_login) ||
      response.status === 400
    ) {
      const alert = await this.alertMessage(
        response.error.error,
        response.error.message
      );
      alert.present();
    } else if (response.status === 0) {
      const alert = await this.alertMessage(
        'Connection Error',
        'Possible reason/s:<br><ul><li>No internet connection</li><li>This app is not properly configured.</li>.</ul>'
      );
      await alert.present();
    } else if (response.status === 422) {
      const alert = await this.alertMessage(
        'Invalid Character/s!',
        "Letters, numbers and '@$_.' are allowed."
      );
      await alert.present();
    } else {
      const alert = await this.alertMessage(
        'Server Error',
        'Please try again.'
      );
      await alert.present();
    }
    return true;
  }
}
