import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

import { ModalController } from '@ionic/angular';
import { ViewDidLeave } from '@ionic/angular';

import { ApiService } from 'src/app/services/api.service';
import { UtilityService } from 'src/app/services/utility.service';
export const INPUT_DATA_TYPE = {
  string: 'STRING/TEXT',
  number: 'NUMBER',
  date: 'DATE',
  email: 'EMAIL ADDRESS',
  image: 'PHOTO/PICTURE/IMAGE',
  boolean: 'BOOLEAN',
  selection: 'SELECTION',
  mobile: 'MOBILE NUMBER',
};

@Component({
  selector: 'app-extra-input-form-modal',
  templateUrl: './extra-input-form-modal.component.html',
  styleUrls: ['./extra-input-form-modal.component.scss'],
})
export class ExtraInputFormModalComponent
  implements OnInit, OnDestroy, ViewDidLeave
{
  @Input() title: string = '';
  @Input() new_extra_input: boolean = false;
  @Input() update_extra_input: boolean = false;
  @Input() extra_input_id: number = 0;
  @Input() modalCtrl: ModalController;
  @Input() searched_extra_input: any = null;
  @Input() extraInputFormGroup: FormGroup;

  private loading: HTMLIonLoadingElement;
  formData: FormData;
  show_additional_fields: boolean = false;
  data_types;
  optionsArray: FormArray;
  disabled_field: boolean = false;

  constructor(
    private apiService: ApiService,
    private utility: UtilityService
  ) {}

  ionViewDidLeave(): void {}

  ngOnInit() {
    this.data_types = INPUT_DATA_TYPE;
    this.optionsArray = this.extraInputFormGroup.controls[
      'options'
    ] as FormArray;

    this.disabled_field =
      this.update_extra_input &&
      (this.searched_extra_input.ticket_extra_properties_count > 0 ||
        this.searched_extra_input.violator_extra_properties_count > 0);

    if (
      this.searched_extra_input &&
      this.update_extra_input &&
      this.extraInputFormGroup.get('data_type').value === 'selection'
    ) {
      this.show_additional_fields = true;
    }

    this.extraInputFormGroup.controls?.data_type.valueChanges.subscribe(
      (value: string) => {
        if (value === 'selection') {
          this.show_additional_fields = true;
          this.addOption();
          this.addOption();
        } else {
          this.show_additional_fields = false;
          this.optionsArray.clear();
        }
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

  async confirmExtraInputAction() {
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
            const operation = this.new_extra_input
              ? 'Saving Failed!'
              : 'Update Failed!';
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    //save user details
                    this.saveExtraInputDetails();
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
  async saveExtraInputDetails() {
    this.loading = await this.utility.createIonLoading();
    this.loading.present();
    if (this.new_extra_input) {
      this.apiService
        .saveExtraInputDetails(this.formData)
        .then(
          //redirect on success
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Details Saved Successfully!'
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

    if (this.update_extra_input) {
      this.formData.append('_method', 'PUT');
      this.apiService
        .updateExtraInput(this.formData, this.extra_input_id)
        .then(
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Details Updated Successfully!'
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

  async startExtraInputAction() {
    //create form data to send on api server
    this.formData = new FormData();
    for (const key in this.extraInputFormGroup.value) {
      this.formData.append(key, this.extraInputFormGroup.get(key).value);
    }
    //prompt user to enter password
    await this.confirmExtraInputAction();
  }

  addOption() {
    const new_option = new FormControl('New Option', [
      Validators.required,
      Validators.pattern('[a-zA-Z0-9Ññ][a-zA-Z0-9Ññ. -]*'),
    ]);
    this.optionsArray.push(new_option);
  }

  deleteOption(index: number) {
    this.optionsArray.removeAt(index);
  }
}
