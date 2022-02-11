import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ViewDidLeave } from '@ionic/angular';
import { UtilityService } from '../../../services/utility.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { ConfigService } from '../../../services/config.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit, ViewDidLeave {
  apiConfigFormGroup: FormGroup = new FormGroup({
    apiDomainCtrl: new FormControl('', Validators.required),
    apiVersionCtrl: new FormControl('', Validators.required),
  });

  superUserFormGroup: FormGroup = new FormGroup({
    suUsernameCtrl: new FormControl(''),
    suPasswordCtrl: new FormControl(''),
    suPasswordConfirmCtrl: new FormControl(
      '',
      this.matchValues('suPasswordCtrl')
    ),
  });
  constructor(
    private config: ConfigService,
    private auth: AuthenticationService,
    private utility: UtilityService
  ) {}

  ionViewDidLeave(): void {
    this.auth.isSuAuthenticated.next(false);
  }

  ngOnInit() {
    this.displayApiDomain();
    this.displaySuperUser();
    this.superUserFormGroup.controls.suPasswordCtrl.valueChanges.subscribe(
      () => {
        this.superUserFormGroup.controls.suPasswordConfirmCtrl.updateValueAndValidity();
      }
    );
  }

  setApiDomain() {
    const api_domain = this.apiConfigFormGroup.get('apiDomainCtrl');
    const api_version = this.apiConfigFormGroup.get('apiVersionCtrl');
    this.config
      .configureApiDomain(api_domain.value, api_version.value, true)
      .then(
        async () => {
          this.auth.api.next({
            domain: api_domain.value,
            version: api_version.value,
          });
          api_domain.markAsPristine();
          api_version.markAsPristine();
          const alert = await this.utility.alertMessage('API Settings Updated');
          alert.present();
        },
        async (err) => {
          const alert = await this.utility.alertMessage(
            'API Settings Update Failed!'
          );
          alert.present();
        }
      );
  }

  setSuperUser() {
    const su_name = this.superUserFormGroup.get('suUsernameCtrl');
    const su_pass = this.superUserFormGroup.get('suPasswordCtrl');
    const su_pass_confirm = this.superUserFormGroup.get(
      'suPasswordConfirmCtrl'
    );
    this.config.configureSuperUser(su_name.value, su_pass.value).then(
      async () => {
        su_name.markAsPristine();
        su_pass.markAsPristine();
        su_pass_confirm.markAsPristine();
        const alert = await this.utility.alertMessage('Account Update Success');
        alert.present();
      },
      async (err) => {
        const alert = await this.utility.alertMessage('Account Update Failed!');
        alert.present();
      }
    );
  }

  async displaySuperUser() {
    let su = { username: '', password: '' };
    await this.config.getSuperUser().then((data) => {
      su = data;
    });
    this.superUserFormGroup.get('suUsernameCtrl').setValue(su.username);
    this.superUserFormGroup.get('suPasswordCtrl').setValue(su.password);
  }

  async displayApiDomain() {
    let api = { domain: '', version: '' };
    await this.config.getApiDomain().then((data) => {
      api = data;
    });
    this.apiConfigFormGroup.get('apiDomainCtrl').setValue(api.domain);
    this.apiConfigFormGroup.get('apiVersionCtrl').setValue(api.version);
  }

  private matchValues(
    matchTo: string // name of the control to match to
  ): (AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      return !!control.parent &&
        !!control.parent.value &&
        control.value === control.parent.controls[matchTo].value
        ? null
        : { isMatching: false };
    };
  }
}
