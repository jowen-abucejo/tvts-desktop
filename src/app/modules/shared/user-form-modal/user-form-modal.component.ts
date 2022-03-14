import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { ModalController } from '@ionic/angular';
import { ViewDidLeave } from '@ionic/angular';

import { ApiService } from 'src/app/services/api.service';
import { UtilityService } from 'src/app/services/utility.service';
@Component({
  selector: 'app-user-form-modal',
  templateUrl: './user-form-modal.component.html',
  styleUrls: ['./user-form-modal.component.scss'],
})
export class UserFormModalComponent implements OnInit, OnDestroy, ViewDidLeave {
  @Input() title: string = '';
  @Input() new_user: boolean = false;
  @Input() update_user: boolean = false;
  @Input() user_id: number = 0;
  @Input() modalCtrl: ModalController;
  @Input() searched_user: any = null;
  @Input() userFormGroup: FormGroup;

  private loading: HTMLIonLoadingElement;
  formData: FormData;
  formReady: boolean = false;

  constructor(
    private apiService: ApiService,
    private utility: UtilityService
  ) {}

  ionViewDidLeave(): void {}

  ngOnInit() {
    if (this.new_user) {
      this.userFormGroup.controls?.name.valueChanges.subscribe(
        (value: string) => {
          const new_value = value.replace(/\s/g, '').toLowerCase();

          this.userFormGroup.controls?.username.setValue(new_value);
          this.userFormGroup.controls?.username.updateValueAndValidity();
        }
      );
    }
  }

  ngOnDestroy() {}

  closeModal(status: boolean = false) {
    this.modalCtrl.dismiss({
      dismissed: true,
      status: status,
    });
  }

  async confirmUserAction(resetLogin: boolean = false) {
    const options = {
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Enter password',
        },
      ],
      buttons: [
        {
          text: 'Continue',
          cssClass: 'secondary',
          handler: async (credentials) => {
            const update_error_feedback = resetLogin
              ? 'Unable to Reset Login Credentials!'
              : 'Account Update Failed!';
            const operation = this.new_user
              ? 'Account Creation Failed!'
              : update_error_feedback;
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    if (resetLogin) {
                      this.resetLogin();
                      return;
                    }
                    //save user details
                    this.saveUserDetails();
                  } else {
                    const alert = await this.utility.alertMessage(
                      operation,
                      'You enter an incorrect password. Please try again.'
                    );
                    alert.present();
                  }
                },

                //show error message
                async (res) => {
                  await this.utility.alertErrorStatus(res);
                }
              );
            } else {
              const alert = await this.utility.alertMessage(operation);
              alert.present();
            }
          },
        },
      ],
    };
    const alert = await this.utility.alertMessage(
      'Confirm Password',
      '',
      options
    );
    await alert.present();
  }

  //resetLogin Credentials
  async resetLogin() {
    this.loading = await this.utility.createIonLoading();
    this.loading.present();
    this.apiService
      .resetUserAccountLogin(this.user_id)
      .then(
        async (data) => {
          const alert = await this.utility.alertMessage(
            'Login Credentials have been Reset!'
          );
          this.closeModal(true);
          return await alert.present();
        },
        //show error message
        async (res) => {
          return await this.utility.alertErrorStatus(res);
        }
      )
      .finally(async () => {
        await this.loading.dismiss();
      });
  }

  //save violation details to server
  async saveUserDetails() {
    this.loading = await this.utility.createIonLoading();
    this.loading.present();
    if (this.new_user) {
      this.apiService
        .saveUserAccount(this.formData)
        .then(
          //redirect on success
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Account Created Successfully!'
            );
            this.closeModal(true);
            return await alert.present();
          },
          //show error message
          async (res) => {
            return await this.utility.alertErrorStatus(res);
          }
        )
        .finally(async () => {
          await this.loading.dismiss();
        });
    }

    if (this.update_user) {
      this.formData.append('_method', 'PUT');
      this.apiService
        .updateUserAccount(this.formData, this.user_id)
        .then(
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Account Updated Successfully!'
            );
            this.closeModal(true);
            return await alert.present();
          },
          //show error message
          async (res) => {
            return await this.utility.alertErrorStatus(res);
          }
        )
        .finally(async () => {
          await this.loading.dismiss();
        });
    }
  }

  async startUserAction() {
    //create form data to send on api server
    this.formData = new FormData();
    for (const key in this.userFormGroup.value) {
      this.formData.append(key, this.userFormGroup.get(key).value);
    }
    //prompt user to enter password
    await this.confirmUserAction();
  }
}
