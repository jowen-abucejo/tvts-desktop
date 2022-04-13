import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  deleteImage,
  imageFile,
} from '../../../modules/shared/custom-input/custom-input.component';
import { ModalController } from '@ionic/angular';
import { ViewDidLeave } from '@ionic/angular';

import { ApiService } from 'src/app/services/api.service';
import { UtilityService } from 'src/app/services/utility.service';
@Component({
  selector: 'app-ticket-form-modal',
  templateUrl: './ticket-form-modal.component.html',
  styleUrls: ['./ticket-form-modal.component.scss'],
})
export class TicketFormModalComponent
  implements OnInit, OnDestroy, ViewDidLeave
{
  @Input() title: string = '';
  @Input() new_ticket: boolean = false;
  @Input() update_ticket: boolean = false;
  @Input() ticket_id: number = 0;
  @Input() modalCtrl: ModalController;
  @Input() searched_violator: any = null;
  @Input() searched_ticket: any = null;
  @Input() violations = {};
  @Input() users = [];
  @Input() ticketFormGroup: FormGroup;

  private loading: HTMLIonLoadingElement;
  vehicle_types = [];
  selectViolations;
  images: imageFile[] = [];
  public extra_inputs = {
    ext_violators: <any>[],
    ext_tickets: <any>[],
  };
  formData: FormData;
  formReady: boolean = false;

  customAlertOptions: any = {
    cssClass: '.alert-violation-selection',
  };

  constructor(
    private apiService: ApiService,
    private utility: UtilityService
  ) {}

  ionViewDidLeave(): void {
    if (this.loading) this.loading.dismiss();
    for (let index = 0; index < this.images.length; index++) {
      const image = this.images[index];
      deleteImage(image.path).catch(() => {});
    }
    this.ticketFormGroup = null;
    this.images = null;
  }

  ngOnInit() {
    for (const key in this.violations) {
      this.vehicle_types.push(key);
    }
    if (this.new_ticket) this.fetchExtraProperties();
    if (this.update_ticket) {
      this.changeSelectViolations(false, this.searched_ticket.vehicle_type);
      this.attachExtraProperties();
    }
  }

  ngOnDestroy() {
    if (this.images) {
      for (let index = 0; index < this.images.length; index++) {
        const image = this.images[index];
        deleteImage(image.path).catch(() => {});
      }
      this.images = null;
    }
    this.ticketFormGroup = null;
  }

  attachExtraProperties() {
    this.extra_inputs.ext_violators = { data: [] };
    this.extra_inputs.ext_tickets = { data: [] };
    //fetch extra details needed for violator
    this.searched_ticket.violator.extra_properties.forEach((extra_input) => {
      const prop_name = extra_input.propertyDescription.property;
      const value =
        extra_input.property_value != 'null' ? extra_input.property_value : '';
      this.ticketFormGroup.addControl(
        prop_name,
        new FormControl(
          value,
          extra_input.is_required ? Validators.required : []
        )
      );
      this.extra_inputs.ext_violators.data.push(
        extra_input.propertyDescription
      );
    });
    this.searched_ticket.extra_properties.forEach((extra_input) => {
      const prop_name = extra_input.propertyDescription.property;
      const value =
        extra_input.property_value != 'null' ? extra_input.property_value : '';
      this.ticketFormGroup.addControl(
        prop_name,
        new FormControl(
          value,
          extra_input.is_required ? Validators.required : []
        )
      );
      this.extra_inputs.ext_tickets.data.push(extra_input.propertyDescription);
    });

    this.formReady = true;
  }

  //change list of violations on change of vehicle type
  changeSelectViolations(clearSelected: boolean = true, vehicle_type = null) {
    this.selectViolations = [];
    vehicle_type = clearSelected
      ? this.ticketFormGroup.get('vehicle_type').value
      : vehicle_type;
    for (let type = 0; type < this.violations[vehicle_type].length; type++) {
      const v = this.violations[vehicle_type][type];
      for (let violation = 0; violation < v.violations.length; violation++) {
        this.selectViolations.push(v.violations[violation]);
      }
    }
    if (clearSelected)
      this.ticketFormGroup.get('committed_violations').setValue(null); //reset value of committed violations
  }

  closeModal(status: boolean = false) {
    this.modalCtrl.dismiss({
      dismissed: true,
      status: status,
    });
  }

  async confirmTicketAction() {
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
            const operation = this.new_ticket
              ? 'Ticket Creation Failed!'
              : 'Ticket Update Failed!';
            if (credentials.password) {
              const formData = new FormData();
              formData.append('password', credentials.password);
              this.apiService.confirmPassword(formData).then(
                async (data: any) => {
                  if (data.password_match_status === true) {
                    //save ticket details
                    this.saveTicketDetails();
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

  fetchExtraProperties() {
    //fetch extra details needed for violator
    this.apiService.getExtraInputs('violator').then((data) => {
      let violator_extra_properties: any[] =
        this.searched_violator.extra_properties;
      this.extra_inputs.ext_violators = data;
      this.extra_inputs.ext_violators.data.forEach((extra_input) => {
        let default_value = extra_input.data_type == 'boolean' ? false : null;
        if (violator_extra_properties) {
          for (
            let index = 0;
            index < violator_extra_properties.length;
            index++
          ) {
            const ext = violator_extra_properties[index];
            if (ext.propertyDescription.id == extra_input.id) {
              default_value =
                ext.property_value != 'null'
                  ? ext.property_value
                  : default_value;
              violator_extra_properties.splice(index, 1);
              break;
            }
          }
        }
        if (extra_input.data_type != 'image') {
          try {
            this.ticketFormGroup.addControl(
              extra_input.property,
              new FormControl(
                default_value,
                extra_input.is_required ? Validators.required : []
              )
            );
          } catch (error) {}
        }
      });
    });

    //fetch extra details needed for ticket
    this.apiService.getExtraInputs('ticket').then((data) => {
      this.extra_inputs.ext_tickets = data;
      this.extra_inputs.ext_tickets.data.forEach((extra_input) => {
        let default_value = extra_input.data_type == 'boolean' ? false : '';
        try {
          this.ticketFormGroup.addControl(
            extra_input.property,
            new FormControl(
              default_value,
              extra_input.is_required ? Validators.required : []
            )
          );
        } catch (error) {}
      });
    });

    this.formReady = true;
  }

  //listen to custom components when it returns an image to be appended in form before submission
  async pushImage(image: imageFile) {
    let resp = await fetch(image.data);
    let blob = await resp.blob();
    this.ticketFormGroup.get(image.property_name).setValue(blob);
    this.images.push(image);
  }

  //save ticket details to server
  async saveTicketDetails() {
    this.loading = await this.utility.createIonLoading();
    this.loading.present();
    if (this.new_ticket) {
      this.apiService
        .saveTicket(this.formData)
        .then(
          //redirect on success
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Ticket Created Successfully!'
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

    if (this.update_ticket) {
      this.formData.append('_method', 'PUT');
      this.apiService
        .updateTicket(this.formData, this.ticket_id)
        .then(
          async (data) => {
            const alert = await this.utility.alertMessage(
              'Ticket Updated Successfully!'
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

  async startTicketAction() {
    //create form data to send on api server
    this.formData = new FormData();
    for (const key in this.ticketFormGroup.value) {
      this.formData.append(key, this.ticketFormGroup.get(key).value);
    }
    if (this.searched_violator && this.searched_violator.id)
      this.formData.append('violator_id', this.searched_violator.id);
    //prompt user to enter password
    await this.confirmTicketAction();
  }

  //function to change values of form controls with boolean type
  toggleValue(formCtrlName: string) {
    const vI = this.ticketFormGroup.get(formCtrlName);
    vI.setValue(!vI.value);
    vI.markAsDirty();
  }
}
