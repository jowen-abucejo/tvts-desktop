import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { UtilityService } from '../../services/utility.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.scss'],
})
export class AccountSettingsPage implements OnInit {
  accountFormGroup: FormGroup = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.pattern('[a-zA-ZÑñ0-9@$_.]*'),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.pattern('[a-zA-ZÑñ0-9@$_.]*'),
    ]),
    new_password: new FormControl('', [
      Validators.required,
      Validators.pattern('[a-zA-ZÑñ0-9@$_.]*'),
    ]),
    password_confirmation: new FormControl('', [
      Validators.required,
      Validators.pattern('[a-zA-ZÑñ0-9@$_.]*'),
      this.matchValues('new_password'),
    ]),
  });

  constructor(
    private apiService: ApiService,
    private utility: UtilityService
  ) {}

  ngOnInit() {
    this.accountFormGroup.controls.new_password.valueChanges.subscribe(() => {
      this.accountFormGroup.controls.password_confirmation.updateValueAndValidity();
    });
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

  async updateAccount() {
    const loading = await this.utility.createIonLoading();
    await loading.present();
    const formData = this.prepareFormData();
    await this.apiService
      .updateAccount(formData)
      .then(
        async (data: any) => {
          let header =
            data && data.update_success
              ? 'Account Update Success'
              : 'Account Update Failed!';
          let message =
            data && data.update_success
              ? 'Your account has been updated.'
              : 'You enter an incorrect current password.';
          const alert = await this.utility.alertMessage(header, message);
          await alert.present();
        },
        async (res) => {
          await this.utility.alertErrorStatus(res);
        }
      )
      .finally(() => {
        loading.dismiss();
      });
  }

  //helper function that prepares data to send into api server
  private prepareFormData() {
    const formData = new FormData();
    for (const key in this.accountFormGroup.value) {
      formData.append(key, this.accountFormGroup.get(key).value);
    }
    return formData;
  }
}
