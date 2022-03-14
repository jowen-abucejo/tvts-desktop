import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { ModalController } from '@ionic/angular';
import { ViewDidLeave } from '@ionic/angular';

import { ApiService } from 'src/app/services/api.service';
import { UtilityService } from 'src/app/services/utility.service';
@Component({
  selector: 'app-payment-form-modal',
  templateUrl: './payment-form-modal.component.html',
  styleUrls: ['./payment-form-modal.component.scss'],
})
export class PaymentFormModalComponent
  implements OnInit, OnDestroy, ViewDidLeave
{
  @Input() title: string = '';
  @Input() new_payment: boolean = false;
  @Input() update_payment: boolean = false;
  @Input() payment_id: number = 0;
  @Input() modalCtrl: ModalController;
  @Input() searched_ticket: any = null;
  @Input() searched_payment: any = null;
  @Input() paymentFormGroup: FormGroup;

  private loading: HTMLIonLoadingElement;
  formData: FormData;
  formReady: boolean = false;

  constructor(
    private apiService: ApiService,
    private utility: UtilityService
  ) {}

  ionViewDidLeave(): void {}

  ngOnInit() {
    this.paymentFormGroup.controls?.penalties.valueChanges.subscribe(
      (value) => {
        let total_amount = 0;
        value.forEach((element) => {
          if (element) total_amount += parseInt(element);
        });
        this.paymentFormGroup.controls?.total_amount.setValue(total_amount);
      }
    );
  }

  ngOnDestroy() {}

  closeModal(status: boolean = false) {
    this.modalCtrl.dismiss({
      dismissed: true,
      status: status,
    });
  }

  async confirmPaymentAction() {
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
            const operation = this.new_payment
              ? 'Violation Creation Failed!'
              : 'Violation Update Failed!';
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    //save violation details
                    this.savePaymentDetails();
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
  async savePaymentDetails() {
    this.loading = await this.utility.createIonLoading();
    this.loading.present();

    if (this.new_payment) {
      this.apiService
        .savePayment(this.formData)
        .then(
          //redirect on success
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Payment Created Successfully!'
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

    if (this.update_payment) {
      this.formData.append('_method', 'PUT');
      this.apiService
        .updatePayment(this.formData, this.searched_payment.id)
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

  async startPaymentAction() {
    //create form data to send on api server
    this.formData = new FormData();
    for (const key in this.paymentFormGroup.value) {
      this.formData.append(key, this.paymentFormGroup.get(key).value);
      console.log(
        '🚀 ~ file: payment-form-modal.component.ts ~ line 170 ~startPaymentAction ~  this.paymentFormGroup.get(key).value',
        this.paymentFormGroup.get(key).value
      );
    }
    //prompt user to enter password
    await this.confirmPaymentAction();
  }
}
