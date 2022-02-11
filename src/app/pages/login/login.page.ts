import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UtilityService } from '../../services/utility.service';
import { AuthenticationService } from '../../services/authentication.service';
import { ViewDidLeave } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit, ViewDidLeave {
  loading: HTMLIonLoadingElement;
  loginFormGroup = new FormGroup({
    unameCtrl: new FormControl('', [
      Validators.required,
      Validators.pattern('[a-zA-ZÑñ0-9@$_.]*'),
    ]),
    passCtrl: new FormControl('', [
      Validators.required,
      Validators.pattern('[a-zA-ZÑñ0-9@$_.]*'),
    ]),
  });

  constructor(
    private auth: AuthenticationService,
    private router: Router,
    private utility: UtilityService
  ) {}
  ionViewDidLeave(): void {
    this.loginFormGroup.get('unameCtrl').setValue('');
    this.loginFormGroup.get('passCtrl').setValue('');
  }

  ngOnInit() {}

  async login() {
    this.loading = await this.utility.createIonLoading();
    await this.loading.present();
    let u = this.loginFormGroup.get('unameCtrl').value;
    let p = this.loginFormGroup.get('passCtrl').value;

    //check if user is superuser
    let isSuperuser = await this.auth.isSuperuser(u, p);

    if (isSuperuser) {
      this.loading.dismiss();
      this.router.navigateByUrl('settings');
    } else {
      this.auth.login(u, p).then(
        //redirect on successful login
        (res) => {
          this.loading.dismiss();
          this.router.navigateByUrl('home', { replaceUrl: true });
        },

        //show error message
        async (res) => {
          this.loading.dismiss();
          await this.utility.alertErrorStatus(res, false);
        }
      );
    }
  }
}
