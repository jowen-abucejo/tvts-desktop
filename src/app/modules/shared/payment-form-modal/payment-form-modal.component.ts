import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { ModalController } from '@ionic/angular';
import { ViewDidLeave } from '@ionic/angular';

import { ApiService } from 'src/app/services/api.service';
import { UtilityService } from 'src/app/services/utility.service';
import pdfMake from 'pdfmake/build/pdfmake';
import * as htmlToImage from 'html-to-image';
import { CustomPageSize, TDocumentDefinitions } from 'pdfmake/interfaces';
import { ToWords } from 'to-words';
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
  or_template: string = '';
  toWords: any;
  full_name: string = '';
  export_on_submit: boolean = true;

  constructor(
    private apiService: ApiService,
    private utility: UtilityService
  ) {}

  ionViewDidLeave(): void {}

  ngOnInit() {
    const violator: any = this.new_payment
      ? this.searched_ticket?.violator
      : this.searched_payment?.ticket?.violator;
    this.full_name = `${violator?.last_name} ${violator?.middle_name} ${violator?.first_name}`;
    this.toWords = new ToWords({
      localeCode: 'en-US',
      converterOptions: {
        currency: true,
        ignoreDecimal: false,
        ignoreZeroCurrency: false,
        doNotAddOnly: false,
      },
    });
    this.paymentFormGroup.controls?.penalties.valueChanges.subscribe(
      (value) => {
        let total_amount = 0.0;
        value.forEach((element) => {
          if (element) total_amount += parseFloat(element);
        });
        this.paymentFormGroup.controls?.total_amount.setValue(total_amount);
      }
    );
    this.getBase64Data();
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

  async getBase64Data() {
    const res = await fetch('../../../../assets/OR Template.jpg');
    const blob = await res.blob();

    const reader = new FileReader();
    reader.onload = () => {
      this.or_template = reader.result as string;
    };
    reader.readAsDataURL(blob);
  }

  async generateReceipt() {
    const dataUrl = await htmlToImage.toPng(
      document.getElementById('orDetails'),
      { backgroundColor: 'transparent', quality: 1 }
    );

    const documentDefinition: TDocumentDefinitions = {
      pageMargins: [0, 0, 0, 0],
      pageSize: <CustomPageSize>{ width: 288, height: 586 },
      background: [
        {
          image: this.or_template,
          fit: [288, 586],
          margin: [0, 0],
        },
      ],
      content: [
        {
          // you'll most often use dataURI images on the browser side
          // if no width/height/fit is provided, the original size will be used
          image: dataUrl,
          fit: [288, 586],
        },
      ],
    };
    pdfMake
      .createPdf(documentDefinition)
      .download('OR' + this.paymentFormGroup.controls.or_number.value + '.pdf');
  }

  toggleExport() {
    this.export_on_submit = !this.export_on_submit;
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
            if (this.export_on_submit) await this.generateReceipt();
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
            if (this.export_on_submit) await this.generateReceipt();
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
    }
    //prompt user to enter password
    // await this.confirmPaymentAction();
    await this.savePaymentDetails();
  }
}
