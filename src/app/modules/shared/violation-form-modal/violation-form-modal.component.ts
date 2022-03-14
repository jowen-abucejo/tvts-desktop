import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { ModalController } from '@ionic/angular';
import { ViewDidLeave } from '@ionic/angular';

import { ApiService } from 'src/app/services/api.service';
import { UtilityService } from 'src/app/services/utility.service';
@Component({
  selector: 'app-violation-form-modal',
  templateUrl: './violation-form-modal.component.html',
  styleUrls: ['./violation-form-modal.component.scss'],
})
export class ViolationFormModalComponent
  implements OnInit, OnDestroy, ViewDidLeave
{
  @Input() title: string = '';
  @Input() new_violation: boolean = false;
  @Input() update_violation: boolean = false;
  @Input() violation_id: number = 0;
  @Input() violation_type_id: number = 0;
  @Input() modalCtrl: ModalController;
  @Input() searched_violation: any = null;
  @Input() violationFormGroup: FormGroup;

  private loading: HTMLIonLoadingElement;
  formData: FormData;
  formReady: boolean = false;

  customAlertOptions: any = {
    cssClass: '.alert-violation-selection',
  };

  constructor(
    private apiService: ApiService,
    private utility: UtilityService
  ) {}

  ionViewDidLeave(): void {}

  ngOnInit() {}

  ngOnDestroy() {}

  closeModal(status: boolean = false) {
    this.modalCtrl.dismiss({
      dismissed: true,
      status: status,
    });
  }

  async confirmViolationAction() {
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
            const operation = this.new_violation
              ? 'Violation Creation Failed!'
              : 'Violation Update Failed!';
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    //save violation details
                    this.saveViolationDetails();
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

  //save violation details to server
  async saveViolationDetails() {
    this.loading = await this.utility.createIonLoading();
    this.loading.present();
    if (this.new_violation) {
      this.apiService
        .saveViolation(this.formData)
        .then(
          //redirect on success
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Violation Created Successfully!'
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

    if (this.update_violation) {
      this.formData.append('_method', 'PUT');
      this.apiService
        .updateViolation(
          this.formData,
          this.violation_id,
          this.violation_type_id
        )
        .then(
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Violation Updated Successfully!'
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

  async startViolationAction() {
    //create form data to send on api server
    this.formData = new FormData();
    for (const key in this.violationFormGroup.value) {
      this.formData.append(key, this.violationFormGroup.get(key).value);
    }
    //prompt user to enter password
    await this.confirmViolationAction();
  }
}
